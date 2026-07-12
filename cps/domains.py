#!/usr/bin/env python3
"""
Bulk company-name -> domain resolver.

Input : text file, one company name per line.
Output: CSV (company, domain, source, confidence).

Strategy per name (stops at first hit):
  1. Clearbit autocomplete API  (free, no key, best for known companies)
  2. DuckDuckGo HTML search      (fallback for obscure names)
  3. Bing HTML search            (fallback when DDG blocks / misses)

Stdlib only. Resumable: rerun and it skips names already in the output CSV.

Usage:
  python domains.py companies.txt
  python domains.py companies.txt -o out.csv -w 6 --delay 0.4
  python domains.py --selftest
"""
import argparse, csv, json, os, re, sys, threading, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from difflib import SequenceMatcher
from urllib.parse import quote_plus, unquote, urlsplit
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

# Domains that are never a company's own site (directories, socials, aggregators).
JUNK = {
    "facebook.com", "linkedin.com", "twitter.com", "x.com", "instagram.com",
    "youtube.com", "wikipedia.org", "bloomberg.com", "crunchbase.com",
    "dnb.com", "zoominfo.com", "glassdoor.com", "indeed.com", "yelp.com",
    "marinetraffic.com", "vesselfinder.com", "shipspotting.com", "equasis.org",
    "opencorporates.com", "tradeindia.com", "indiamart.com", "exportersindia.com",
    "yellowpages.com", "europages.com", "kompass.com", "manta.com",
    "amazon.com", "google.com", "bing.com", "duckduckgo.com", "maps.google.com",
    "researchgate.net", "scribd.com", "slideshare.net", "issuu.com",
}

_LEGAL = re.compile(
    r"\b(ltd|limited|inc|incorporated|llc|llp|pvt|private|co|company|corp|"
    r"corporation|gmbh|bv|nv|plc|pte|sa|srl|ag|as|group|holdings?|intl|"
    r"international|shipping|marine|maritime|logistics|services?)\b", re.I)
_NONALNUM = re.compile(r"[^a-z0-9]+")

# Trailing legal/geographic noise to strip so "CATERPILLAR MEXICO S A DE C V"
# becomes "CATERPILLAR". Mexican (SA/CV/RL/SPR/SAPI...) + generic forms.
_STOP = {
    "SA", "CV", "RL", "SC", "SPR", "SAPI", "SAB", "SADECV", "SDERL", "EN",
    "DE", "S", "A", "C", "V", "R", "L", "MEXICO", "MEXICANA", "MX",
    "CORP", "CORPORATION", "INC", "INCORPORATED", "LLC", "LLP", "LTD",
    "LIMITED", "CO", "COMPANY", "COMPANIA", "GROUP", "GRUPO", "INTL",
    "INTERNATIONAL", "AND",
}


def clean_query(name):
    """Strip trailing legal-entity + geo noise. Never returns empty."""
    toks = re.sub(r"[.,/&()]", " ", name.upper()).split()
    while toks and toks[-1] in _STOP:
        toks.pop()
    return " ".join(toks) if toks else name.strip()


def _get(url, timeout=15):
    req = Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def clean_domain(url):
    """Return the registrable-ish host: lowercase, no www/port/path. '' if none."""
    if not url:
        return ""
    if url.startswith("//"):
        url = "http:" + url
    if "://" not in url:
        url = "http://" + url
    host = urlsplit(url).netloc.lower().split("@")[-1].split(":")[0]
    return host[4:] if host.startswith("www.") else host


def is_junk(domain):
    if not domain or "." not in domain:
        return True
    # gov / edu / military are never one of these companies
    if re.search(r"\.(gov|gob|edu|mil|ac)(\.|$)", domain):
        return True
    # match junk by suffix so www./sub.domains are caught too
    return any(domain == j or domain.endswith("." + j) for j in JUNK)


def _norm(s):
    """Normalize a name for comparison: drop legal suffixes + punctuation."""
    s = _LEGAL.sub(" ", s.lower())
    return _NONALNUM.sub("", s)


def score(name, domain):
    """0..1 similarity between the company name and the domain's root label."""
    if not domain:
        return 0.0
    root = domain.split(".")[0]
    return SequenceMatcher(None, _norm(name), _norm(root)).ratio()


def _clearbit_once(query):
    url = "https://autocomplete.clearbit.com/v1/companies/suggest?query=" + quote_plus(query)
    try:
        data = json.loads(_get(url))
    except (URLError, HTTPError, ValueError, TimeoutError):
        return "", -1.0
    best, best_s = "", -1.0
    for item in data or []:
        d = clean_domain(item.get("domain", ""))
        if is_junk(d):
            continue
        # prefer suggestion whose name OR domain best matches the query
        s = max(score(query, d),
                SequenceMatcher(None, _norm(query), _norm(item.get("name", ""))).ratio())
        if s > best_s:
            best, best_s = d, s
    return best, best_s


def clearbit(query):
    best, s = _clearbit_once(query)
    if best:
        return best
    # brand fallback: retry with just the first 2 words, but only trust a
    # confident match (else "AMERICAN ROLL" -> "AMERICAN" grabs the wrong co).
    words = query.split()
    if len(words) > 2:
        b2, s2 = _clearbit_once(" ".join(words[:2]))
        if b2 and s2 >= 0.6:
            return b2
    return ""


def _first_good(hosts):
    for h in hosts:
        h = clean_domain(h)
        if not is_junk(h):
            return h
    return ""


def duckduckgo(name):
    url = "https://html.duckduckgo.com/html/?q=" + quote_plus(name + " official website")
    try:
        html = _get(url)
    except (URLError, HTTPError, TimeoutError):
        return ""
    # DDG wraps result links as //duckduckgo.com/l/?uddg=<encoded>
    hosts = [unquote(m) for m in re.findall(r'uddg=([^&"]+)', html)]
    if not hosts:  # sometimes direct hrefs
        hosts = re.findall(r'class="result__a"[^>]*href="([^"]+)"', html)
    return _first_good(hosts)


def bing(name):
    url = "https://www.bing.com/search?q=" + quote_plus(name + " official website")
    try:
        html = _get(url)
    except (URLError, HTTPError, TimeoutError):
        return ""
    hosts = re.findall(r'<li class="b_algo".*?<a[^>]+href="(https?://[^"]+)"', html, re.S)
    return _first_good(hosts)


def resolve(name):
    """Return (domain, source). Empty domain => not found."""
    q = clean_query(name)
    for src, fn in (("clearbit", clearbit), ("duckduckgo", duckduckgo), ("bing", bing)):
        d = fn(q)
        if d:
            return d, src
    return "", ""


def label(name, domain):
    s = score(clean_query(name), domain)
    return "high" if s >= 0.75 else "medium" if s >= 0.45 else "low"


def load_done(path):
    if not os.path.exists(path):
        return set()
    with open(path, newline="", encoding="utf-8") as f:
        return {row[0] for row in csv.reader(f) if row and row[0] != "company"}


def main(argv=None):
    p = argparse.ArgumentParser(description="Bulk company name -> domain.")
    p.add_argument("input", nargs="?", help="txt file, one company per line")
    p.add_argument("-o", "--output", default="domains.csv")
    p.add_argument("-w", "--workers", type=int, default=6)
    p.add_argument("--delay", type=float, default=0.3, help="seconds between requests per worker")
    p.add_argument("--selftest", action="store_true")
    a = p.parse_args(argv)

    if a.selftest:
        return selftest()
    if not a.input:
        p.error("input file required (or use --selftest)")

    with open(a.input, encoding="utf-8") as f:
        names = [ln.strip() for ln in f if ln.strip()]
    done = load_done(a.output)
    todo = [n for n in names if n not in done]
    print(f"{len(names)} names, {len(done)} already done, {len(todo)} to do", file=sys.stderr)

    lock = threading.Lock()
    new = not os.path.exists(a.output)
    out = open(a.output, "a", newline="", encoding="utf-8")
    writer = csv.writer(out)
    if new:
        writer.writerow(["company", "domain", "source", "confidence"])
        out.flush()

    def work(name):
        time.sleep(a.delay)  # gentle pacing so search engines don't block
        try:
            d, src = resolve(name)
        except Exception as e:  # never lose the batch over one bad name
            d, src = "", f"error:{type(e).__name__}"
        conf = label(name, d) if d else ""
        with lock:
            writer.writerow([name, d, src, conf])
            out.flush()
            print(f"{'OK ' if d else '-- '} {name} -> {d or '(none)'} [{src}]", file=sys.stderr)

    try:
        with ThreadPoolExecutor(max_workers=a.workers) as ex:
            for fut in as_completed(ex.submit(work, n) for n in todo):
                fut.result()
    finally:
        out.close()
    print(f"done -> {a.output}", file=sys.stderr)


def selftest():
    assert clean_domain("https://www.Maersk.com/about") == "maersk.com"
    assert clean_domain("//duckduckgo.com/l/") == "duckduckgo.com"
    assert clean_domain("HTTP://sub.Example.CO.UK:8080/x") == "sub.example.co.uk"
    assert clean_domain("") == ""
    assert is_junk("linkedin.com") and is_junk("in.linkedin.com")
    assert is_junk("marinetraffic.com")
    assert is_junk("monroecc.edu") and is_junk("tlalpan.cdmx.gob.mx")
    assert not is_junk("maersk.com") and not is_junk("deyac.com.mx")
    assert is_junk("notadomain")
    assert _first_good(["//linkedin.com/x", "https://maersk.com"]) == "maersk.com"
    assert _first_good(["//facebook.com/a", "//twitter.com/b"]) == ""
    assert score("Maersk Line Ltd", "maersk.com") > 0.7
    assert score("A P Moller Maersk", "qwzxkp.com") < 0.4
    assert clean_query("CATERPILLAR MEXICO S A DE C V") == "CATERPILLAR"
    assert clean_query("SKF DE MEXICO SA DE CV") == "SKF"
    assert clean_query("CONTITECH MEXICANA SA DE CV") == "CONTITECH"
    assert clean_query("ALSTOM TRANSPORTATION INC") == "ALSTOM TRANSPORTATION"
    assert clean_query("EPL PROPACK DE MEXICO, S.A. DE C.V.") == "EPL PROPACK"
    assert clean_query("S A DE C V") == "S A DE C V"  # never empties
    assert label("Maersk Line", "maersk.com") == "high"
    # DDG uddg extraction on a synthetic snippet
    snip = 'href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.maersk.com%2F&rut=x"'
    hosts = [unquote(m) for m in re.findall(r'uddg=([^&"]+)', snip)]
    assert clean_domain(hosts[0]) == "maersk.com"
    print("selftest OK")


if __name__ == "__main__":
    main()
