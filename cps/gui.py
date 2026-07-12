#!/usr/bin/env python3
"""
GUI for the bulk company-name -> domain scraper.

Pick a .txt (one company per line), Start. Results stay in memory until YOU
click Export CSV or Export TXT. Nothing is saved automatically.

  CSV = company, domain, source, confidence
  TXT = domains only, one per line (deduped, blanks skipped)

Reuses domains.py. Stdlib only (tkinter). Run:  python gui.py
"""
import csv, os, queue, threading, time, tkinter as tk
from concurrent.futures import ThreadPoolExecutor, as_completed
from tkinter import ttk, filedialog, messagebox, scrolledtext

from domains import resolve, label


class App:
    def __init__(self, root):
        self.root = root
        root.title("Company -> Domain scraper")
        root.geometry("760x560")
        self.q = queue.Queue()
        self.stop = threading.Event()
        self.running = False
        self.results = []  # list of [company, domain, source, confidence]

        pad = dict(padx=8, pady=4)
        frm = ttk.Frame(root)
        frm.pack(fill="x", **pad)

        ttk.Label(frm, text="Company list (.txt):").grid(row=0, column=0, sticky="w")
        self.inp = tk.StringVar()
        ttk.Entry(frm, textvariable=self.inp, width=64).grid(row=0, column=1, sticky="we")
        ttk.Button(frm, text="Browse", command=self.pick).grid(row=0, column=2)

        opt = ttk.Frame(frm)
        opt.grid(row=1, column=1, sticky="w", pady=6)
        ttk.Label(opt, text="Workers:").pack(side="left")
        self.workers = tk.IntVar(value=6)
        ttk.Spinbox(opt, from_=1, to=32, width=4, textvariable=self.workers).pack(side="left")
        ttk.Label(opt, text="   Delay(s):").pack(side="left")
        self.delay = tk.DoubleVar(value=0.3)
        ttk.Spinbox(opt, from_=0, to=5, increment=0.1, width=5,
                    textvariable=self.delay).pack(side="left")
        frm.columnconfigure(1, weight=1)

        ctl = ttk.Frame(root)
        ctl.pack(fill="x", **pad)
        self.start_btn = ttk.Button(ctl, text="Start", command=self.start)
        self.start_btn.pack(side="left")
        self.stop_btn = ttk.Button(ctl, text="Stop", command=self.stop.set, state="disabled")
        self.stop_btn.pack(side="left", padx=6)
        self.prog = ttk.Progressbar(ctl, mode="determinate")
        self.prog.pack(side="left", fill="x", expand=True, padx=8)
        self.count = ttk.Label(ctl, text="0 / 0")
        self.count.pack(side="left")

        exp = ttk.Frame(root)
        exp.pack(fill="x", **pad)
        ttk.Button(exp, text="Export CSV", command=self.export_csv).pack(side="left")
        ttk.Button(exp, text="Export TXT (domains only)",
                   command=self.export_txt).pack(side="left", padx=6)
        self.found = ttk.Label(exp, text="")
        self.found.pack(side="left", padx=8)

        self.log = scrolledtext.ScrolledText(root, height=20, state="disabled")
        self.log.pack(fill="both", expand=True, **pad)

        root.after(100, self.drain)

    def pick(self):
        f = filedialog.askopenfilename(filetypes=[("Text", "*.txt"), ("All", "*.*")])
        if f:
            self.inp.set(f)

    def write_log(self, msg):
        self.log.configure(state="normal")
        self.log.insert("end", msg + "\n")
        self.log.see("end")
        self.log.configure(state="disabled")

    def start(self):
        if self.running:
            return
        path = self.inp.get().strip()
        if not os.path.isfile(path):
            messagebox.showerror("No file", "Pick a valid .txt company list first.")
            return
        self.results = []
        self.stop.clear()
        self.running = True
        self.start_btn.configure(state="disabled")
        self.stop_btn.configure(state="normal")
        self.found.configure(text="")
        threading.Thread(target=self.run, args=(path,), daemon=True).start()

    # --- worker thread ---------------------------------------------------
    def run(self, path):
        with open(path, encoding="utf-8") as f:
            names = [ln.strip() for ln in f if ln.strip()]
        self.q.put(("total", len(names)))
        self.q.put(("log", f"{len(names)} names to do"))
        delay = self.delay.get()

        def work(name):
            if self.stop.is_set():
                return
            time.sleep(delay)
            try:
                d, src = resolve(name)
            except Exception as e:
                d, src = "", f"error:{type(e).__name__}"
            conf = label(name, d) if d else ""
            self.q.put(("row", [name, d, src, conf]))

        with ThreadPoolExecutor(max_workers=self.workers.get()) as ex:
            futs = [ex.submit(work, n) for n in names]
            for fut in as_completed(futs):
                fut.result()
                if self.stop.is_set():
                    for f in futs:
                        f.cancel()
                    break
        self.q.put(("done", "stopped" if self.stop.is_set() else "finished"))

    # --- export (GUI thread) --------------------------------------------
    def export_csv(self):
        if not self.results:
            messagebox.showinfo("Nothing yet", "Run a scrape first.")
            return
        f = filedialog.asksaveasfilename(defaultextension=".csv", initialfile="domains.csv",
                                         filetypes=[("CSV", "*.csv")])
        if not f:
            return
        with open(f, "w", newline="", encoding="utf-8") as out:
            w = csv.writer(out)
            w.writerow(["company", "domain", "source", "confidence"])
            w.writerows(self.results)
        messagebox.showinfo("Saved", f"{len(self.results)} rows -> {f}")

    def export_txt(self):
        if not self.results:
            messagebox.showinfo("Nothing yet", "Run a scrape first.")
            return
        seen, doms = set(), []
        for _, d, *_ in self.results:
            if d and d not in seen:
                seen.add(d)
                doms.append(d)
        if not doms:
            messagebox.showinfo("No domains", "No domains found to export.")
            return
        f = filedialog.asksaveasfilename(defaultextension=".txt", initialfile="domains.txt",
                                         filetypes=[("Text", "*.txt")])
        if not f:
            return
        with open(f, "w", encoding="utf-8") as out:
            out.write("\n".join(doms) + "\n")
        messagebox.showinfo("Saved", f"{len(doms)} domains -> {f}")

    # --- GUI-thread queue drain -----------------------------------------
    def drain(self):
        try:
            while True:
                kind, val = self.q.get_nowait()
                if kind == "total":
                    self.prog.configure(maximum=max(val, 1), value=0)
                    self.count.configure(text=f"0 / {val}")
                elif kind == "row":
                    self.results.append(val)
                    self.prog.step(1)
                    done = int(self.prog["value"])
                    self.count.configure(text=f"{done} / {int(self.prog['maximum'])}")
                    hits = sum(1 for r in self.results if r[1])
                    self.found.configure(text=f"{hits} domains found")
                    name, d, src, _ = val
                    self.write_log(f"{'OK ' if d else '-- '}{name} -> {d or '(none)'} [{src}]")
                elif kind == "log":
                    self.write_log(val)
                elif kind == "done":
                    self.write_log(val + " — click Export CSV / Export TXT to save")
                    self.running = False
                    self.start_btn.configure(state="normal")
                    self.stop_btn.configure(state="disabled")
        except queue.Empty:
            pass
        self.root.after(100, self.drain)


if __name__ == "__main__":
    root = tk.Tk()
    App(root)
    root.mainloop()
