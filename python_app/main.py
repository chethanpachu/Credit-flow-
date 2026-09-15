"""
GRB Collection Tracker - Desktop Application (Tkinter + Excel Storage)
Dual-Interface System:
 1. Salesman Interface (Strict Isolation: no access to other salesmen's bills/numbers)
    - Area selection comes FIRST in Add Bill
    - Assign pending bills to drivers for next-day collection
    - View assigned driver collections list
 2. Admin Interface:
    - Verify entries per salesman (Approved / Flagged)
    - Reconcile cash handovers
    - Manage Driver Collection Sheets & Run Manifests for next day
    - Setup (Areas, Salesmen, Drivers, Area Mapping)
    - Master Credit Breach Monitor (> 30 days)
"""

import sys
import os
import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
from datetime import date, datetime, timedelta
from excel_manager import ExcelManager, EXCEL_FILE

ADMIN_PIN = "9999"

class GRBDualApp:
    def __init__(self, root):
        self.root = root
        self.root.title("GRB Collection Tracker - Dual Interface Desktop")
        self.root.geometry("1140x740")
        self.root.minsize(1020, 660)

        try:
            self.manager = ExcelManager()
        except Exception as e:
            messagebox.showerror("Initialization Error", f"Failed to open/initialize {EXCEL_FILE}:\n{str(e)}")
            sys.exit(1)

        self.current_user_role = None # 'admin' or 'salesman'
        self.current_salesman = None  # Dict of logged-in salesman

        self.style = ttk.Style()
        try:
            self.style.theme_use("clam")
        except Exception:
            pass
        self._setup_custom_styles()

        self.container = tk.Frame(self.root, bg="#F1F5F9")
        self.container.pack(fill=tk.BOTH, expand=True)

        self.show_login_screen()

    def _setup_custom_styles(self):
        self.style.configure("TNotebook", background="#F1F5F9", tabmargins=[4, 4, 2, 0])
        self.style.configure("TNotebook.Tab", padding=[14, 7], font=("Segoe UI", 9, "bold"))
        self.style.map("TNotebook.Tab", 
            background=[("selected", "#FFFFFF"), ("!selected", "#E2E8F0")],
            foreground=[("selected", "#0F172A"), ("!selected", "#475569")]
        )
        self.style.configure("Treeview.Heading", font=("Segoe UI", 9, "bold"), background="#E2E8F0")
        self.style.configure("Treeview", font=("Segoe UI", 9), rowheight=24)

    def _clear_container(self):
        for widget in self.container.winfo_children():
            widget.destroy()

    # =========================================================================
    # SCREEN 1: LOGIN / ROLE SELECTION
    # =========================================================================
    def show_login_screen(self):
        self.current_user_role = None
        self.current_salesman = None
        self._clear_container()

        header = tk.Frame(self.container, bg="#1E293B", height=70)
        header.pack(fill=tk.X)
        tk.Label(header, text="GRB Collection Tracker", font=("Segoe UI", 16, "bold"), fg="#FFFFFF", bg="#1E293B").pack(pady=(12, 2))
        tk.Label(header, text="Select Portal to Continue • Isolated Salesman Views & Admin Verification", font=("Segoe UI", 9), fg="#94A3B8", bg="#1E293B").pack(pady=(0, 10))

        center_frame = tk.Frame(self.container, bg="#F1F5F9")
        center_frame.pack(expand=True)

        card = tk.Frame(center_frame, bg="#FFFFFF", padx=36, pady=28, relief=tk.SOLID, bd=1)
        card.pack()

        tk.Label(card, text="Select Your Role", font=("Segoe UI", 13, "bold"), bg="#FFFFFF", fg="#0F172A").pack(pady=(0, 16))

        # Salesman section
        s_box = tk.LabelFrame(card, text=" 👤 Salesman Portal ", font=("Segoe UI", 10, "bold"), bg="#FFFFFF", fg="#1E3A8A", padx=16, pady=14)
        s_box.pack(fill=tk.X, pady=(0, 16))

        tk.Label(s_box, text="Select Salesman:", font=("Segoe UI", 9), bg="#FFFFFF").grid(row=0, column=0, sticky="w", pady=4)
        self.login_salesman_var = tk.StringVar()
        salesmen = self.manager.get_salesmen()
        s_names = [f"{s.get('SalesmanID')} - {s.get('SalesmanName')}" for s in salesmen]
        self.s_combo = ttk.Combobox(s_box, textvariable=self.login_salesman_var, values=s_names, state="readonly", width=28)
        if s_names:
            self.s_combo.current(0)
        self.s_combo.grid(row=0, column=1, padx=8, pady=4)

        tk.Label(s_box, text="4-Digit PIN:", font=("Segoe UI", 9), bg="#FFFFFF").grid(row=1, column=0, sticky="w", pady=4)
        self.login_pin_entry = tk.Entry(s_box, show="*", width=12, font=("Segoe UI", 10))
        self.login_pin_entry.insert(0, "1234")
        self.login_pin_entry.grid(row=1, column=1, sticky="w", padx=8, pady=4)

        btn_salesman_login = tk.Button(s_box, text="Login to Salesman Portal", bg="#2563EB", fg="#FFFFFF", font=("Segoe UI", 9, "bold"), relief=tk.FLAT, padx=12, pady=5, command=self._do_salesman_login)
        btn_salesman_login.grid(row=2, column=0, columnspan=2, pady=(10, 0))

        # Admin section
        a_box = tk.LabelFrame(card, text=" 🛡️ Admin / Manager Portal ", font=("Segoe UI", 10, "bold"), bg="#FFFFFF", fg="#991B1B", padx=16, pady=14)
        a_box.pack(fill=tk.X)

        tk.Label(a_box, text="Admin PIN (Default: 9999):", font=("Segoe UI", 9), bg="#FFFFFF").grid(row=0, column=0, sticky="w", pady=4)
        self.admin_pin_entry = tk.Entry(a_box, show="*", width=12, font=("Segoe UI", 10))
        self.admin_pin_entry.insert(0, "9999")
        self.admin_pin_entry.grid(row=0, column=1, sticky="w", padx=8, pady=4)

        btn_admin_login = tk.Button(a_box, text="Login to Admin Portal", bg="#0F172A", fg="#FFFFFF", font=("Segoe UI", 9, "bold"), relief=tk.FLAT, padx=12, pady=5, command=self._do_admin_login)
        btn_admin_login.grid(row=1, column=0, columnspan=2, pady=(10, 0))

        lbl_sec = tk.Label(card, text="🔒 Strict Privacy Active: Salesmen cannot view other salesmen's entries.", font=("Segoe UI", 8, "italic"), fg="#64748B", bg="#FFFFFF")
        lbl_sec.pack(pady=(16, 0))

    def _do_salesman_login(self):
        val = self.login_salesman_var.get()
        if not val:
            messagebox.showwarning("Selection Required", "Please select a salesman.")
            return
        s_id = val.split(" - ")[0].strip()
        salesmen = self.manager.get_salesmen()
        s_obj = next((s for s in salesmen if str(s.get("SalesmanID")) == s_id), None)
        if not s_obj:
            messagebox.showerror("Error", "Salesman not found.")
            return

        expected_pin = str(s_obj.get("PIN") or "1234").strip()
        entered_pin = self.login_pin_entry.get().strip()

        if entered_pin != expected_pin:
            messagebox.showerror("Access Denied", "Incorrect PIN for this salesman.")
            return

        self.current_user_role = "salesman"
        self.current_salesman = s_obj
        self.show_salesman_interface()

    def _do_admin_login(self):
        entered_pin = self.admin_pin_entry.get().strip()
        if entered_pin != ADMIN_PIN:
            messagebox.showerror("Access Denied", "Incorrect Admin PIN.")
            return

        self.current_user_role = "admin"
        self.current_salesman = None
        self.show_admin_interface()

    # =========================================================================
    # SCREEN 2: SALESMAN INTERFACE (STRICT PRIVACY)
    # =========================================================================
    def show_salesman_interface(self):
        self._clear_container()
        s_id = self.current_salesman.get("SalesmanID")
        s_name = self.current_salesman.get("SalesmanName")

        # Top Bar
        top_bar = tk.Frame(self.container, bg="#1E3A8A", height=50)
        top_bar.pack(fill=tk.X)

        tk.Label(top_bar, text=f"👤 Salesman Portal: {s_name} ({s_id})", font=("Segoe UI", 12, "bold"), fg="#FFFFFF", bg="#1E3A8A").pack(side=tk.LEFT, padx=16, pady=10)
        
        assigned_areas = [a.get("AreaID") for a in self.manager.get_areas_for_salesman(s_id)]
        tk.Label(top_bar, text=f"Assigned Areas: {', '.join(assigned_areas) or 'None'}", font=("Segoe UI", 9), fg="#93C5FD", bg="#1E3A8A").pack(side=tk.LEFT, padx=8, pady=10)

        btn_logout = tk.Button(top_bar, text="🚪 Switch User / Logout", font=("Segoe UI", 9), bg="#1E293B", fg="#FFFFFF", relief=tk.FLAT, padx=10, command=self.show_login_screen)
        btn_logout.pack(side=tk.RIGHT, padx=16, pady=10)

        # Notebook
        self.s_notebook = ttk.Notebook(self.container)
        self.s_notebook.pack(fill=tk.BOTH, expand=True, padx=8, pady=6)

        tab_add_bill = ttk.Frame(self.s_notebook, padding=10)
        tab_collection = ttk.Frame(self.s_notebook, padding=10)
        tab_driver_assign = ttk.Frame(self.s_notebook, padding=10)
        tab_my_summary = ttk.Frame(self.s_notebook, padding=10)

        self.s_notebook.add(tab_add_bill, text=" 1. Add Bill (Area First) ")
        self.s_notebook.add(tab_collection, text=" 2. Evening Collection & Assign to Driver ")
        self.s_notebook.add(tab_driver_assign, text=" 3. My Driver Assignments ")
        self.s_notebook.add(tab_my_summary, text=" 4. My Cash Handover ")

        self._build_salesman_add_bill_tab(tab_add_bill)
        self._build_salesman_collection_tab(tab_collection)
        self._build_salesman_driver_tab(tab_driver_assign)
        self._build_salesman_summary_tab(tab_my_summary)

    def _build_salesman_add_bill_tab(self, parent):
        s_id = self.current_salesman.get("SalesmanID")
        my_areas = self.manager.get_areas_for_salesman(s_id)
        area_choices = [f"{a.get('AreaID')} - {a.get('AreaName')}" for a in my_areas]

        f_left = tk.LabelFrame(parent, text=" New Bill Entry (Area Selection First) ", font=("Segoe UI", 10, "bold"), padx=14, pady=12)
        f_left.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))

        # 1. AREA SELECTION COMES FIRST
        tk.Label(f_left, text="1. Select Area: *", font=("Segoe UI", 9, "bold"), fg="#1E3A8A").grid(row=0, column=0, sticky="w", pady=4)
        self.s_bill_area_var = tk.StringVar()
        self.s_bill_area_cb = ttk.Combobox(f_left, textvariable=self.s_bill_area_var, values=area_choices, state="readonly", width=26)
        if area_choices:
            self.s_bill_area_cb.current(0)
        self.s_bill_area_cb.grid(row=0, column=1, padx=6, pady=4)

        # 2. Bill Number
        tk.Label(f_left, text="2. Bill Number: *", font=("Segoe UI", 9)).grid(row=1, column=0, sticky="w", pady=4)
        self.s_bill_num_ent = tk.Entry(f_left, width=28)
        self.s_bill_num_ent.grid(row=1, column=1, padx=6, pady=4)

        # 3. Shop Name
        tk.Label(f_left, text="3. Shop Name: *", font=("Segoe UI", 9)).grid(row=2, column=0, sticky="w", pady=4)
        self.s_shop_name_ent = tk.Entry(f_left, width=28)
        self.s_shop_name_ent.grid(row=2, column=1, padx=6, pady=4)

        # 4. Amount
        tk.Label(f_left, text="4. Bill Amount (₹): *", font=("Segoe UI", 9)).grid(row=3, column=0, sticky="w", pady=4)
        self.s_bill_amt_ent = tk.Entry(f_left, width=28)
        self.s_bill_amt_ent.grid(row=3, column=1, padx=6, pady=4)

        # 5. Date Issued
        tk.Label(f_left, text="5. Date Issued:", font=("Segoe UI", 9)).grid(row=4, column=0, sticky="w", pady=4)
        self.s_bill_dt_ent = tk.Entry(f_left, width=28)
        self.s_bill_dt_ent.insert(0, date.today().strftime("%Y-%m-%d"))
        self.s_bill_dt_ent.grid(row=4, column=1, padx=6, pady=4)

        btn_save = tk.Button(f_left, text="💾 Save Bill (Enter)", font=("Segoe UI", 9, "bold"), bg="#16A34A", fg="#FFFFFF", relief=tk.FLAT, padx=14, pady=6, command=self._save_salesman_bill)
        btn_save.grid(row=5, column=0, columnspan=2, pady=(14, 6))

        for w in [self.s_bill_area_cb, self.s_bill_num_ent, self.s_shop_name_ent, self.s_bill_amt_ent, self.s_bill_dt_ent]:
            w.bind("<Return>", lambda e: self._save_salesman_bill())

        tk.Label(f_left, text="• Strict check: Double billing blocked for pending shops.\n• Only assigned areas visible to you.", font=("Segoe UI", 8, "italic"), fg="#64748B", justify=tk.LEFT).grid(row=6, column=0, columnspan=2, pady=(10, 0))

        # Right side: Running list of bills in this salesman's territory
        f_right = tk.LabelFrame(parent, text=" Bills in Your Assigned Territory ", font=("Segoe UI", 10, "bold"), padx=10, pady=8)
        f_right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        cols = ("BillID", "BillNumber", "ShopName", "AreaID", "Amount", "Balance", "DateIssued", "Status")
        self.s_bills_tree = ttk.Treeview(f_right, columns=cols, show="headings", height=16)
        for c in cols:
            self.s_bills_tree.heading(c, text=c)
            self.s_bills_tree.column(c, width=95, anchor="center")
        self.s_bills_tree.column("ShopName", width=180, anchor="w")

        sb = ttk.Scrollbar(f_right, orient="vertical", command=self.s_bills_tree.yview)
        self.s_bills_tree.configure(yscrollcommand=sb.set)
        self.s_bills_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb.pack(side=tk.RIGHT, fill=tk.Y)

        self._refresh_salesman_bills_tree()

    def _save_salesman_bill(self):
        area_val = self.s_bill_area_var.get()
        if not area_val:
            messagebox.showwarning("Area Required", "Please select an Area first.")
            return
        area_id = area_val.split(" - ")[0].strip()
        bill_num = self.s_bill_num_ent.get().strip()
        shop_name = self.s_shop_name_ent.get().strip()
        amt_str = self.s_bill_amt_ent.get().strip()
        dt_str = self.s_bill_dt_ent.get().strip()

        try:
            amt = float(amt_str)
            if amt <= 0:
                raise ValueError()
        except ValueError:
            messagebox.showerror("Invalid Amount", "Please enter a valid positive bill amount.")
            return

        try:
            self.manager.add_bill(area_id, bill_num, shop_name, amt, dt_str)
            messagebox.showinfo("Success", f"Bill #{bill_num} added successfully for {shop_name}!")
            self.s_bill_num_ent.delete(0, tk.END)
            self.s_shop_name_ent.delete(0, tk.END)
            self.s_bill_amt_ent.delete(0, tk.END)
            self.s_bill_num_ent.focus_set()
            self._refresh_salesman_bills_tree()
        except Exception as e:
            messagebox.showerror("Save Failed", str(e))

    def _refresh_salesman_bills_tree(self):
        for item in self.s_bills_tree.get_children():
            self.s_bills_tree.delete(item)
        s_id = self.current_salesman.get("SalesmanID")
        my_areas = {a.get("AreaID") for a in self.manager.get_areas_for_salesman(s_id)}
        all_bills = self.manager.get_bills()
        # Strictly filter by this salesman's areas
        my_bills = [b for b in all_bills if b.get("AreaID") in my_areas]

        for b in reversed(my_bills):
            self.s_bills_tree.insert("", tk.END, values=(
                b.get("BillID"), b.get("BillNumber"), b.get("ShopName"),
                b.get("AreaID"), f"₹{float(b.get('Amount') or 0):,.2f}",
                f"₹{float(b.get('Balance') or 0):,.2f}", b.get("DateIssued"),
                b.get("Status")
            ))

    def _build_salesman_collection_tab(self, parent):
        top_ctrl = tk.Frame(parent, bg="#F1F5F9")
        top_ctrl.pack(fill=tk.X, pady=(0, 8))

        tk.Label(top_ctrl, text="Collection Date:", font=("Segoe UI", 9, "bold")).pack(side=tk.LEFT, padx=(0, 6))
        self.s_coll_date_ent = tk.Entry(top_ctrl, width=12)
        self.s_coll_date_ent.insert(0, date.today().strftime("%Y-%m-%d"))
        self.s_coll_date_ent.pack(side=tk.LEFT, padx=(0, 16))

        tk.Button(top_ctrl, text="🔄 Refresh Pending Bills", bg="#E2E8F0", font=("Segoe UI", 8), command=self._refresh_salesman_pending_bills).pack(side=tk.LEFT)

        tk.Label(top_ctrl, text="Select bill below to collect OR assign to driver for tomorrow ➔", font=("Segoe UI", 9, "italic"), fg="#475569").pack(side=tk.RIGHT)

        # Pending Bills Tree
        cols = ("BillID", "BillNumber", "ShopName", "AreaID", "Amount", "Balance", "DateIssued")
        self.s_pending_tree = ttk.Treeview(parent, columns=cols, show="headings", height=10)
        for c in cols:
            self.s_pending_tree.heading(c, text=c)
            self.s_pending_tree.column(c, width=100, anchor="center")
        self.s_pending_tree.column("ShopName", width=220, anchor="w")
        self.s_pending_tree.pack(fill=tk.BOTH, expand=True, pady=(0, 8))

        # Action bar at bottom: Collect OR Assign to Driver
        act_box = tk.LabelFrame(parent, text=" Actions on Selected Pending Bill ", font=("Segoe UI", 9, "bold"), padx=12, pady=8)
        act_box.pack(fill=tk.X)

        tk.Label(act_box, text="Amount Collected (₹):", font=("Segoe UI", 9, "bold")).grid(row=0, column=0, padx=6, pady=4)
        self.s_collect_amt_ent = tk.Entry(act_box, width=14, font=("Segoe UI", 10, "bold"))
        self.s_collect_amt_ent.grid(row=0, column=1, padx=6, pady=4)

        btn_collect = tk.Button(act_box, text="✅ Record My Evening Collection", bg="#16A34A", fg="#FFFFFF", font=("Segoe UI", 9, "bold"), padx=10, pady=4, relief=tk.FLAT, command=self._record_salesman_collection)
        btn_collect.grid(row=0, column=2, padx=12, pady=4)

        sep = ttk.Separator(act_box, orient="vertical")
        sep.grid(row=0, column=3, sticky="ns", padx=16)

        # Driver assignment action
        btn_assign_driver = tk.Button(act_box, text="🚚 Assign Selected Bill to Driver for Tomorrow", bg="#EA580C", fg="#FFFFFF", font=("Segoe UI", 9, "bold"), padx=10, pady=4, relief=tk.FLAT, command=self._open_driver_assign_dialog)
        btn_assign_driver.grid(row=0, column=4, padx=6, pady=4)

        self.s_pending_tree.bind("<<TreeviewSelect>>", self._on_pending_bill_selected)
        self._refresh_salesman_pending_bills()

    def _on_pending_bill_selected(self, event):
        sel = self.s_pending_tree.selection()
        if sel:
            item = self.s_pending_tree.item(sel[0])
            bal_str = str(item["values"][5]).replace("₹", "").replace(",", "").strip()
            self.s_collect_amt_ent.delete(0, tk.END)
            self.s_collect_amt_ent.insert(0, bal_str)

    def _refresh_salesman_pending_bills(self):
        for item in self.s_pending_tree.get_children():
            self.s_pending_tree.delete(item)
        s_id = self.current_salesman.get("SalesmanID")
        pending = self.manager.get_pending_bills_for_salesman(s_id)
        for b in pending:
            self.s_pending_tree.insert("", tk.END, values=(
                b.get("BillID"), b.get("BillNumber"), b.get("ShopName"),
                b.get("AreaID"), f"₹{float(b.get('Amount') or 0):,.2f}",
                f"₹{float(b.get('Balance') or 0):,.2f}", b.get("DateIssued")
            ))

    def _record_salesman_collection(self):
        sel = self.s_pending_tree.selection()
        if not sel:
            messagebox.showwarning("Select Bill", "Please select a pending bill from the table.")
            return
        item = self.s_pending_tree.item(sel[0])
        bill_num = str(item["values"][1])
        s_id = self.current_salesman.get("SalesmanID")
        coll_date = self.s_coll_date_ent.get().strip()

        try:
            amt = float(self.s_collect_amt_ent.get().strip())
            if amt <= 0:
                raise ValueError()
        except ValueError:
            messagebox.showerror("Invalid Amount", "Please enter a valid collection amount.")
            return

        try:
            res = self.manager.record_collection(bill_num, s_id, amt, coll_date)
            messagebox.showinfo("Collection Saved", f"Successfully recorded ₹{amt:,.2f} for Bill #{bill_num}.\nStatus: {res['NewStatus']}\nRemaining Balance: ₹{res['RemainingBalance']:,.2f}")
            self.s_collect_amt_ent.delete(0, tk.END)
            self._refresh_salesman_pending_bills()
        except Exception as e:
            messagebox.showerror("Collection Error", str(e))

    def _open_driver_assign_dialog(self):
        sel = self.s_pending_tree.selection()
        if not sel:
            messagebox.showwarning("Select Bill", "Please select a pending bill to assign to a driver.")
            return
        item = self.s_pending_tree.item(sel[0])
        bill_num = str(item["values"][1])
        shop_name = str(item["values"][2])
        bal_str = str(item["values"][5]).replace("₹", "").replace(",", "").strip()

        dlg = tk.Toplevel(self.root)
        dlg.title(f"Assign Bill #{bill_num} to Driver")
        dlg.geometry("460x340")
        dlg.transient(self.root)
        dlg.grab_set()

        tk.Label(dlg, text="Assign Bill Collection to Driver", font=("Segoe UI", 11, "bold"), fg="#EA580C").pack(pady=10)
        tk.Label(dlg, text=f"Shop: {shop_name} | Bill #{bill_num} | Balance: ₹{bal_str}", font=("Segoe UI", 9, "bold")).pack()

        form = tk.Frame(dlg, padx=20, pady=10)
        form.pack(fill=tk.BOTH, expand=True)

        tk.Label(form, text="Select Driver: *", font=("Segoe UI", 9)).grid(row=0, column=0, sticky="w", pady=6)
        drivers = self.manager.get_drivers()
        d_choices = [f"{d.get('DriverID')} - {d.get('DriverName')}" for d in drivers]
        d_var = tk.StringVar()
        d_cb = ttk.Combobox(form, textvariable=d_var, values=d_choices, state="readonly", width=28)
        if d_choices:
            d_cb.current(0)
        d_cb.grid(row=0, column=1, padx=6, pady=6)

        tk.Label(form, text="Amount to Collect (₹): *", font=("Segoe UI", 9)).grid(row=1, column=0, sticky="w", pady=6)
        amt_ent = tk.Entry(form, width=28)
        amt_ent.insert(0, bal_str)
        amt_ent.grid(row=1, column=1, padx=6, pady=6)

        tk.Label(form, text="Scheduled Date (Tomorrow):", font=("Segoe UI", 9)).grid(row=2, column=0, sticky="w", pady=6)
        tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
        dt_ent = tk.Entry(form, width=28)
        dt_ent.insert(0, tomorrow)
        dt_ent.grid(row=2, column=1, padx=6, pady=6)

        tk.Label(form, text="Driver Notes:", font=("Segoe UI", 9)).grid(row=3, column=0, sticky="w", pady=6)
        notes_ent = tk.Entry(form, width=28)
        notes_ent.insert(0, "Collect payment in morning")
        notes_ent.grid(row=3, column=1, padx=6, pady=6)

        def do_assign():
            d_val = d_var.get()
            if not d_val:
                messagebox.showwarning("Driver Required", "Please select a driver.")
                return
            driver_id = d_val.split(" - ")[0].strip()
            try:
                amt = float(amt_ent.get().strip())
                if amt <= 0:
                    raise ValueError()
            except ValueError:
                messagebox.showerror("Error", "Invalid collection amount.")
                return

            try:
                res = self.manager.assign_bill_to_driver(
                    bill_number=bill_num,
                    salesman_id=self.current_salesman.get("SalesmanID"),
                    driver_id=driver_id,
                    amount_to_collect=amt,
                    scheduled_date=dt_ent.get().strip(),
                    notes=notes_ent.get().strip()
                )
                messagebox.showinfo("Assigned!", f"Bill #{bill_num} assigned to driver {res['DriverName']} for collection on {res['ScheduledDate']}!")
                dlg.destroy()
                self._refresh_salesman_driver_tree()
            except Exception as e:
                messagebox.showerror("Assignment Error", str(e))

        tk.Button(dlg, text="✅ Confirm Driver Assignment", bg="#EA580C", fg="#FFFFFF", font=("Segoe UI", 9, "bold"), padx=14, pady=6, relief=tk.FLAT, command=do_assign).pack(pady=12)

    def _build_salesman_driver_tab(self, parent):
        tk.Label(parent, text="Bills You Assigned to Drivers for Collection", font=("Segoe UI", 10, "bold"), fg="#0F172A").pack(anchor="w", pady=(0, 6))

        cols = ("AssignmentID", "BillNumber", "ShopName", "DriverName", "AmountToCollect", "ScheduledDate", "Status", "Notes")
        self.s_driver_tree = ttk.Treeview(parent, columns=cols, show="headings", height=14)
        for c in cols:
            self.s_driver_tree.heading(c, text=c)
            self.s_driver_tree.column(c, width=110, anchor="center")
        self.s_driver_tree.column("ShopName", width=180, anchor="w")
        self.s_driver_tree.column("Notes", width=180, anchor="w")

        sb = ttk.Scrollbar(parent, orient="vertical", command=self.s_driver_tree.yview)
        self.s_driver_tree.configure(yscrollcommand=sb.set)
        self.s_driver_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb.pack(side=tk.RIGHT, fill=tk.Y)

        self._refresh_salesman_driver_tree()

    def _refresh_salesman_driver_tree(self):
        for item in self.s_driver_tree.get_children():
            self.s_driver_tree.delete(item)
        s_id = self.current_salesman.get("SalesmanID")
        my_assignments = self.manager.get_driver_assignments(salesman_id=s_id)
        for a in reversed(my_assignments):
            self.s_driver_tree.insert("", tk.END, values=(
                a.get("AssignmentID"), a.get("BillNumber"), a.get("ShopName"),
                a.get("DriverName"), f"₹{float(a.get('AmountToCollect') or 0):,.2f}",
                a.get("ScheduledDate"), a.get("Status"), a.get("Notes")
            ))

    def _build_salesman_summary_tab(self, parent):
        s_id = self.current_salesman.get("SalesmanID")
        s_name = self.current_salesman.get("SalesmanName")

        card = tk.LabelFrame(parent, text=f" Evening Cash Handover for {s_name} ", font=("Segoe UI", 10, "bold"), padx=16, pady=14)
        card.pack(fill=tk.X, pady=8)

        today_str = date.today().strftime("%Y-%m-%d")
        colls_today = self.manager.get_collections_by_date(today_str, salesman_id=s_id)
        my_total_collected = sum(float(c.get("AmountCollected") or 0) for c in colls_today)

        tk.Label(card, text=f"Today's System Logged Collections ({today_str}):", font=("Segoe UI", 10)).grid(row=0, column=0, sticky="w", pady=4)
        tk.Label(card, text=f"₹{my_total_collected:,.2f}", font=("Segoe UI", 12, "bold"), fg="#16A34A").grid(row=0, column=1, sticky="w", padx=10, pady=4)

        tk.Label(card, text="Actual Cash You are Handing Over (₹): *", font=("Segoe UI", 9, "bold")).grid(row=1, column=0, sticky="w", pady=8)
        self.s_handover_ent = tk.Entry(card, width=16, font=("Segoe UI", 11, "bold"))
        self.s_handover_ent.insert(0, str(my_total_collected))
        self.s_handover_ent.grid(row=1, column=1, sticky="w", padx=10, pady=8)

        def save_handover():
            try:
                amt = float(self.s_handover_ent.get().strip())
                self.manager.save_cash_handover(s_id, today_str, amt)
                messagebox.showinfo("Handover Recorded", f"Cash handover of ₹{amt:,.2f} recorded for {s_name} on {today_str}.\nSubmitted to Admin for verification.")
            except Exception as e:
                messagebox.showerror("Error", str(e))

        btn_submit_cash = tk.Button(card, text="💵 Submit Cash Handover to Admin", bg="#1E3A8A", fg="#FFFFFF", font=("Segoe UI", 9, "bold"), padx=14, pady=5, relief=tk.FLAT, command=save_handover)
        btn_submit_cash.grid(row=2, column=0, columnspan=2, pady=10)

        # Show collection history for today
        tk.Label(parent, text="Your Recorded Collections for Today:", font=("Segoe UI", 9, "bold")).pack(anchor="w", pady=(10, 4))
        cols = ("CollectionID", "BillNumber", "ShopName", "AmountCollected", "VerificationStatus")
        t = ttk.Treeview(parent, columns=cols, show="headings", height=8)
        for c in cols:
            t.heading(c, text=c)
            t.column(c, width=120, anchor="center")
        t.column("ShopName", width=200, anchor="w")
        t.pack(fill=tk.BOTH, expand=True)

        for c in colls_today:
            t.insert("", tk.END, values=(
                c.get("CollectionID"), c.get("BillNumber"), c.get("ShopName"),
                f"₹{float(c.get('AmountCollected') or 0):,.2f}",
                c.get("VerificationStatus") or "Pending Review"
            ))

    # =========================================================================
    # SCREEN 3: ADMIN INTERFACE (VERIFICATION, MANIFESTS & AUDIT)
    # =========================================================================
    def show_admin_interface(self):
        self._clear_container()

        top_bar = tk.Frame(self.container, bg="#0F172A", height=50)
        top_bar.pack(fill=tk.X)

        tk.Label(top_bar, text="🛡️ Admin Control & Verification Portal", font=("Segoe UI", 12, "bold"), fg="#FFFFFF", bg="#0F172A").pack(side=tk.LEFT, padx=16, pady=10)
        tk.Label(top_bar, text="Supervise All 4 Salesmen • Verify Entries • Generate Next-Day Driver Manifests", font=("Segoe UI", 9), fg="#94A3B8", bg="#0F172A").pack(side=tk.LEFT, padx=8, pady=10)

        btn_logout = tk.Button(top_bar, text="🚪 Switch User / Logout", font=("Segoe UI", 9), bg="#334155", fg="#FFFFFF", relief=tk.FLAT, padx=10, command=self.show_login_screen)
        btn_logout.pack(side=tk.RIGHT, padx=16, pady=10)

        self.a_notebook = ttk.Notebook(self.container)
        self.a_notebook.pack(fill=tk.BOTH, expand=True, padx=8, pady=6)

        tab_verify = ttk.Frame(self.a_notebook, padding=10)
        tab_driver_manifest = ttk.Frame(self.a_notebook, padding=10)
        tab_reconcile = ttk.Frame(self.a_notebook, padding=10)
        tab_master_bills = ttk.Frame(self.a_notebook, padding=10)
        tab_setup = ttk.Frame(self.a_notebook, padding=10)

        self.a_notebook.add(tab_verify, text=" 1. Verify Salesman Entries ")
        self.a_notebook.add(tab_driver_manifest, text=" 2. Driver Next-Day Run Manifest ")
        self.a_notebook.add(tab_reconcile, text=" 3. Daily Cash Reconciliation ")
        self.a_notebook.add(tab_master_bills, text=" 4. Master Bills & Overdue (>30d) ")
        self.a_notebook.add(tab_setup, text=" 5. Master Setup & Drivers ")

        self._build_admin_verify_tab(tab_verify)
        self._build_admin_driver_manifest_tab(tab_driver_manifest)
        self._build_admin_reconcile_tab(tab_reconcile)
        self._build_admin_master_bills_tab(tab_master_bills)
        self._build_admin_setup_tab(tab_setup)

    def _build_admin_verify_tab(self, parent):
        ctrl = tk.Frame(parent, bg="#F1F5F9")
        ctrl.pack(fill=tk.X, pady=(0, 8))

        tk.Label(ctrl, text="Audit Date:", font=("Segoe UI", 9, "bold")).pack(side=tk.LEFT, padx=(0, 6))
        self.a_verify_dt_ent = tk.Entry(ctrl, width=12)
        self.a_verify_dt_ent.insert(0, date.today().strftime("%Y-%m-%d"))
        self.a_verify_dt_ent.pack(side=tk.LEFT, padx=(0, 16))

        tk.Label(ctrl, text="Filter Salesman:", font=("Segoe UI", 9, "bold")).pack(side=tk.LEFT, padx=(0, 6))
        self.a_verify_s_var = tk.StringVar(value="ALL")
        salesmen = self.manager.get_salesmen()
        s_choices = ["ALL"] + [f"{s.get('SalesmanID')} - {s.get('SalesmanName')}" for s in salesmen]
        cb_s = ttk.Combobox(ctrl, textvariable=self.a_verify_s_var, values=s_choices, state="readonly", width=22)
        cb_s.current(0)
        cb_s.pack(side=tk.LEFT, padx=(0, 16))

        tk.Button(ctrl, text="🔍 Load Entries", bg="#2563EB", fg="#FFFFFF", font=("Segoe UI", 9, "bold"), padx=10, relief=tk.FLAT, command=self._refresh_admin_verify_tree).pack(side=tk.LEFT)

        # Verification actions bar
        act_frame = tk.Frame(ctrl)
        act_frame.pack(side=tk.RIGHT)

        btn_verify = tk.Button(act_frame, text="✅ Approve Selected Entry", bg="#16A34A", fg="#FFFFFF", font=("Segoe UI", 9, "bold"), padx=10, relief=tk.FLAT, command=lambda: self._set_verification_status("Verified"))
        btn_verify.pack(side=tk.LEFT, padx=4)

        btn_flag = tk.Button(act_frame, text="🚩 Flag Issue / Discrepancy", bg="#DC2626", fg="#FFFFFF", font=("Segoe UI", 9, "bold"), padx=10, relief=tk.FLAT, command=lambda: self._set_verification_status("Flagged"))
        btn_flag.pack(side=tk.LEFT, padx=4)

        # Treeview of entries
        cols = ("CollectionID", "Salesman", "BillNumber", "ShopName", "AmountCollected", "CollectionDate", "Status", "AdminNotes")
        self.a_verify_tree = ttk.Treeview(parent, columns=cols, show="headings", height=16)
        for c in cols:
            self.a_verify_tree.heading(c, text=c)
            self.a_verify_tree.column(c, width=110, anchor="center")
        self.a_verify_tree.column("ShopName", width=180, anchor="w")
        self.a_verify_tree.column("AdminNotes", width=180, anchor="w")

        sb = ttk.Scrollbar(parent, orient="vertical", command=self.a_verify_tree.yview)
        self.a_verify_tree.configure(yscrollcommand=sb.set)
        self.a_verify_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb.pack(side=tk.RIGHT, fill=tk.Y)

        self._refresh_admin_verify_tree()

    def _refresh_admin_verify_tree(self):
        for item in self.a_verify_tree.get_children():
            self.a_verify_tree.delete(item)
        target_dt = self.a_verify_dt_ent.get().strip()
        s_val = self.a_verify_s_var.get()
        s_filter = None if s_val == "ALL" else s_val.split(" - ")[0].strip()

        entries = self.manager.get_collections_by_date(target_dt, salesman_id=s_filter)
        for e in entries:
            self.a_verify_tree.insert("", tk.END, values=(
                e.get("CollectionID"), f"{e.get('SalesmanID')} - {e.get('SalesmanName')}",
                e.get("BillNumber"), e.get("ShopName"),
                f"₹{float(e.get('AmountCollected') or 0):,.2f}",
                e.get("CollectionDate"), e.get("VerificationStatus") or "Pending Review",
                e.get("AdminNotes") or ""
            ))

    def _set_verification_status(self, status: str):
        sel = self.a_verify_tree.selection()
        if not sel:
            messagebox.showwarning("Select Entry", "Please select a collection entry from the table.")
            return
        item = self.a_verify_tree.item(sel[0])
        coll_id = str(item["values"][0])

        notes = simpledialog.askstring("Admin Notes", f"Enter verification remarks for {coll_id} (optional):", initialvalue="Verified and approved" if status == "Verified" else "Mismatch in voucher")
        if notes is None:
            return

        self.manager.verify_collection(coll_id, status, notes)
        messagebox.showinfo("Status Updated", f"Entry {coll_id} marked as {status}!")
        self._refresh_admin_verify_tree()

    def _build_admin_driver_manifest_tab(self, parent):
        top_ctrl = tk.Frame(parent, bg="#F1F5F9")
        top_ctrl.pack(fill=tk.X, pady=(0, 8))

        tk.Label(top_ctrl, text="Scheduled Date:", font=("Segoe UI", 9, "bold")).pack(side=tk.LEFT, padx=(0, 6))
        tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
        self.a_driver_dt_ent = tk.Entry(top_ctrl, width=12)
        self.a_driver_dt_ent.insert(0, tomorrow)
        self.a_driver_dt_ent.pack(side=tk.LEFT, padx=(0, 16))

        tk.Button(top_ctrl, text="🔄 Filter Manifest", bg="#E2E8F0", font=("Segoe UI", 8), command=self._refresh_admin_driver_manifest_tree).pack(side=tk.LEFT, padx=4)

        tk.Button(top_ctrl, text="📋 Export / Print Manifest for Driver", bg="#0F172A", fg="#FFFFFF", font=("Segoe UI", 9, "bold"), padx=12, relief=tk.FLAT, command=self._export_driver_manifest).pack(side=tk.LEFT, padx=16)

        # Action: mark collected by driver
        btn_driver_collected = tk.Button(top_ctrl, text="💰 Mark Driver Collection Received", bg="#16A34A", fg="#FFFFFF", font=("Segoe UI", 9, "bold"), padx=10, relief=tk.FLAT, command=self._mark_driver_collected)
        btn_driver_collected.pack(side=tk.RIGHT, padx=4)

        cols = ("AssignmentID", "DriverName", "Salesman", "BillNumber", "ShopName", "AreaID", "AmountToCollect", "ScheduledDate", "Status", "Notes")
        self.a_manifest_tree = ttk.Treeview(parent, columns=cols, show="headings", height=16)
        for c in cols:
            self.a_manifest_tree.heading(c, text=c)
            self.a_manifest_tree.column(c, width=105, anchor="center")
        self.a_manifest_tree.column("ShopName", width=160, anchor="w")
        self.a_manifest_tree.column("Notes", width=160, anchor="w")

        sb = ttk.Scrollbar(parent, orient="vertical", command=self.a_manifest_tree.yview)
        self.a_manifest_tree.configure(yscrollcommand=sb.set)
        self.a_manifest_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb.pack(side=tk.RIGHT, fill=tk.Y)

        self._refresh_admin_driver_manifest_tree()

    def _refresh_admin_driver_manifest_tree(self):
        for item in self.a_manifest_tree.get_children():
            self.a_manifest_tree.delete(item)
        target_dt = self.a_driver_dt_ent.get().strip()
        all_assign = self.manager.get_driver_assignments()
        filtered = [a for a in all_assign if str(a.get("ScheduledDate")) == target_dt or not target_dt]

        for a in filtered:
            self.a_manifest_tree.insert("", tk.END, values=(
                a.get("AssignmentID"), a.get("DriverName"), a.get("SalesmanName"),
                a.get("BillNumber"), a.get("ShopName"), a.get("AreaID"),
                f"₹{float(a.get('AmountToCollect') or 0):,.2f}",
                a.get("ScheduledDate"), a.get("Status"), a.get("Notes")
            ))

    def _export_driver_manifest(self):
        target_dt = self.a_driver_dt_ent.get().strip()
        all_assign = self.manager.get_driver_assignments()
        filtered = [a for a in all_assign if str(a.get("ScheduledDate")) == target_dt]
        if not filtered:
            messagebox.showinfo("Empty Manifest", f"No bills scheduled for driver collection on {target_dt}.")
            return

        lines = [
            f"============================================================",
            f"          GRB DISTRIBUTORSHIP - DRIVER COLLECTION MANIFEST",
            f"Scheduled Date: {target_dt}",
            f"============================================================",
            f"{'Bill #':<10} | {'Shop Name':<24} | {'Area':<6} | {'Driver':<18} | {'Amount (₹)':>10}",
            f"------------------------------------------------------------"
        ]
        total_amt = 0
        for a in filtered:
            amt = float(a.get("AmountToCollect") or 0)
            total_amt += amt
            lines.append(f"{str(a.get('BillNumber')):<10} | {str(a.get('ShopName'))[:24]:<24} | {str(a.get('AreaID')):<6} | {str(a.get('DriverName'))[:18]:<18} | {amt:>10,.2f}")
        lines.append(f"------------------------------------------------------------")
        lines.append(f"TOTAL TO COLLECT: ₹{total_amt:,.2f}")
        lines.append(f"============================================================")

        text_content = "\n".join(lines)
        manifest_file = f"driver_manifest_{target_dt}.txt"
        with open(manifest_file, "w", encoding="utf-8") as f:
            f.write(text_content)

        # Show in popup dialog
        dlg = tk.Toplevel(self.root)
        dlg.title(f"Driver Manifest - {target_dt}")
        dlg.geometry("640x480")
        t = tk.Text(dlg, font=("Courier New", 9))
        t.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        t.insert(tk.END, text_content)
        messagebox.showinfo("Manifest Saved", f"Manifest generated and saved to {manifest_file}!\nReady to print and hand to driver.")

    def _mark_driver_collected(self):
        sel = self.a_manifest_tree.selection()
        if not sel:
            messagebox.showwarning("Select Bill", "Please select a bill from the manifest.")
            return
        item = self.a_manifest_tree.item(sel[0])
        assign_id = str(item["values"][0])
        amt_str = str(item["values"][6]).replace("₹", "").replace(",", "").strip()
        amt = float(amt_str)

        self.manager.update_driver_assignment_status(assign_id, "Collected", amt)
        messagebox.showinfo("Updated", f"Assignment {assign_id} marked as Collected (₹{amt:,.2f})!")
        self._refresh_admin_driver_manifest_tree()

    def _build_admin_reconcile_tab(self, parent):
        top_ctrl = tk.Frame(parent, bg="#F1F5F9")
        top_ctrl.pack(fill=tk.X, pady=(0, 8))

        tk.Label(top_ctrl, text="Reconciliation Date:", font=("Segoe UI", 9, "bold")).pack(side=tk.LEFT, padx=(0, 6))
        self.a_recon_dt_ent = tk.Entry(top_ctrl, width=12)
        self.a_recon_dt_ent.insert(0, date.today().strftime("%Y-%m-%d"))
        self.a_recon_dt_ent.pack(side=tk.LEFT, padx=(0, 16))

        tk.Button(top_ctrl, text="🔄 Recalculate Dues", bg="#2563EB", fg="#FFFFFF", font=("Segoe UI", 8, "bold"), command=self._refresh_admin_reconcile_tree).pack(side=tk.LEFT)

        cols = ("SalesmanID", "SalesmanName", "SystemTotal", "AmountHanded", "Difference", "AuditStatus")
        self.a_recon_tree = ttk.Treeview(parent, columns=cols, show="headings", height=8)
        for c in cols:
            self.a_recon_tree.heading(c, text=c)
            self.a_recon_tree.column(c, width=140, anchor="center")
        self.a_recon_tree.column("SalesmanName", width=180, anchor="w")
        self.a_recon_tree.pack(fill=tk.BOTH, expand=True, pady=(0, 10))

        self._refresh_admin_reconcile_tree()

    def _refresh_admin_reconcile_tree(self):
        for item in self.a_recon_tree.get_children():
            self.a_recon_tree.delete(item)
        target_dt = self.a_recon_dt_ent.get().strip()
        summary = self.manager.get_reconciliation_summary(target_dt)
        for row in summary:
            diff = row["Difference"]
            status_str = "MATCHES" if row["IsMatched"] else f"MISMATCH (₹{abs(diff):,.2f})"
            self.a_recon_tree.insert("", tk.END, values=(
                row["SalesmanID"], row["SalesmanName"],
                f"₹{row['SystemTotal']:,.2f}", f"₹{row['AmountHanded']:,.2f}",
                f"{'+' if diff > 0 else ''}₹{diff:,.2f}", status_str
            ))

    def _build_admin_master_bills_tab(self, parent):
        tk.Label(parent, text="Search All Distributorship Bills & 30-Day Credit Term Breaches", font=("Segoe UI", 10, "bold")).pack(anchor="w", pady=(0, 6))

        cols = ("BillID", "BillNumber", "ShopName", "AreaID", "Amount", "Balance", "DateIssued", "AgeDays", "Status", "CreditRisk")
        self.a_master_tree = ttk.Treeview(parent, columns=cols, show="headings", height=16)
        for c in cols:
            self.a_master_tree.heading(c, text=c)
            self.a_master_tree.column(c, width=95, anchor="center")
        self.a_master_tree.column("ShopName", width=180, anchor="w")

        sb = ttk.Scrollbar(parent, orient="vertical", command=self.a_master_tree.yview)
        self.a_master_tree.configure(yscrollcommand=sb.set)
        self.a_master_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb.pack(side=tk.RIGHT, fill=tk.Y)

        self._refresh_admin_master_tree()

    def _refresh_admin_master_tree(self):
        for item in self.a_master_tree.get_children():
            self.a_master_tree.delete(item)
        today = date.today()
        bills = self.manager.get_bills()

        for b in reversed(bills):
            dt_str = str(b.get("DateIssued") or "")
            try:
                issued = datetime.strptime(dt_str, "%Y-%m-%d").date()
                days_old = (today - issued).days
            except Exception:
                days_old = 0
            is_pending = str(b.get("Status")).lower() == "pending" or float(b.get("Balance") or 0) > 0
            is_breach = is_pending and days_old > 30
            risk_tag = "🚨 BREACH (>30d)" if is_breach else ("Cleared" if not is_pending else "Normal (<30d)")

            self.a_master_tree.insert("", tk.END, values=(
                b.get("BillID"), b.get("BillNumber"), b.get("ShopName"),
                b.get("AreaID"), f"₹{float(b.get('Amount') or 0):,.2f}",
                f"₹{float(b.get('Balance') or 0):,.2f}", dt_str,
                f"{days_old}d", b.get("Status"), risk_tag
            ))

    def _build_admin_setup_tab(self, parent):
        top_split = tk.Frame(parent)
        top_split.pack(fill=tk.BOTH, expand=True)

        # 1. Add Driver
        f_drv = tk.LabelFrame(top_split, text=" Add Delivery Driver ", font=("Segoe UI", 9, "bold"), padx=10, pady=8)
        f_drv.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=4)

        tk.Label(f_drv, text="Driver ID (e.g. D3):").grid(row=0, column=0, sticky="w", pady=4)
        drv_id_ent = tk.Entry(f_drv, width=16)
        drv_id_ent.grid(row=0, column=1, pady=4)

        tk.Label(f_drv, text="Driver Name & Van #:").grid(row=1, column=0, sticky="w", pady=4)
        drv_nm_ent = tk.Entry(f_drv, width=22)
        drv_nm_ent.grid(row=1, column=1, pady=4)

        tk.Label(f_drv, text="Phone Number:").grid(row=2, column=0, sticky="w", pady=4)
        drv_ph_ent = tk.Entry(f_drv, width=22)
        drv_ph_ent.grid(row=2, column=1, pady=4)

        def add_drv():
            try:
                self.manager.add_driver(drv_id_ent.get(), drv_nm_ent.get(), drv_ph_ent.get())
                messagebox.showinfo("Success", "Driver added!")
                drv_id_ent.delete(0, tk.END)
                drv_nm_ent.delete(0, tk.END)
                drv_ph_ent.delete(0, tk.END)
            except Exception as e:
                messagebox.showerror("Error", str(e))

        tk.Button(f_drv, text="Add Driver", bg="#0F172A", fg="#FFFFFF", font=("Segoe UI", 9, "bold"), command=add_drv).grid(row=3, column=0, columnspan=2, pady=8)

        # 2. Add Area
        f_area = tk.LabelFrame(top_split, text=" Add Area ", font=("Segoe UI", 9, "bold"), padx=10, pady=8)
        f_area.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=4)

        tk.Label(f_area, text="Area ID (e.g. A9):").grid(row=0, column=0, sticky="w", pady=4)
        a_id_ent = tk.Entry(f_area, width=16)
        a_id_ent.grid(row=0, column=1, pady=4)

        tk.Label(f_area, text="Area Name:").grid(row=1, column=0, sticky="w", pady=4)
        a_nm_ent = tk.Entry(f_area, width=22)
        a_nm_ent.grid(row=1, column=1, pady=4)

        def add_area():
            try:
                self.manager.add_area(a_id_ent.get(), a_nm_ent.get())
                messagebox.showinfo("Success", "Area added!")
                a_id_ent.delete(0, tk.END)
                a_nm_ent.delete(0, tk.END)
            except Exception as e:
                messagebox.showerror("Error", str(e))

        tk.Button(f_area, text="Add Area", bg="#0F172A", fg="#FFFFFF", font=("Segoe UI", 9, "bold"), command=add_area).grid(row=2, column=0, columnspan=2, pady=8)

def main():
    root = tk.Tk()
    app = GRBDualApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()
