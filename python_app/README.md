# GRB Collection Tracker (Windows Desktop App)

A lightweight, fully offline Windows desktop application built with **Python + Tkinter** and **Excel storage (`openpyxl`)** for a GRB items distributorship managing 4 salesmen, daily bill issuance, evening cash collection, and reconciliation.

---

## Key Features & Business Rules
1. **Single Excel Workbook Storage (`grb_data.xlsx`)**:
   - Zero database setup required. All data resides in `grb_data.xlsx` with formatted header styling and atomic writes (safe against crashes/power cuts).
   - Six structured sheets: `Areas`, `Salesmen`, `SalesmanAreas`, `Bills`, `CollectionHistory`, `CashHandover`.
2. **No Double Billing Enforcement**:
   - Customers with an unpaid pending bill cannot receive a new bill until the old one is cleared.
   - The app blocks the entry immediately and shows the pending bill number, date, and outstanding balance.
3. **Fast Bill Entry**:
   - Keyboard-optimized: Fill the form and press **Enter** to save and reset focus for high-volume entry.
   - Blocks duplicate bill numbers with clear alerts.
4. **Evening Collection per Salesman**:
   - Select one of the 4 salesmen returning from the field.
   - Automatically displays pending bills across their assigned areas.
   - Defaults collected amount to full balance, with editable partial payment.
   - Disallows payments exceeding the remaining balance.
   - Records an append-only row in `CollectionHistory` and marks the bill `paid` when balance reaches ₹0.
5. **Daily Reconciliation Dashboard**:
   - Compares system collections logged for that date against physical cash handed over.
   - Instant visual indicator: **`✔ MATCHES`** or **`⚠ MISMATCH: ₹X`**.
   - Drill-down ledger showing bill-by-bill collections per salesman.
6. **30-Day Credit Limit Monitor (History Tab)**:
   - Search by Bill Number or Shop Name.
   - Automatically calculates bill age and highlights any pending bill older than 1 month (30 days) in **bold RED** as a credit breach.

---

## How to Run from Source

### 1. Prerequisites
- Windows 10 or 11 (or Linux/macOS with Tkinter installed)
- Python 3.9 or higher (Ensure "Add Python to PATH" is checked during Python installation)

### 2. Install Required Packages
Open Command Prompt (`cmd`) or PowerShell in this folder and run:
```bash
pip install -r requirements.txt
```
*(Only `openpyxl` is required for running; `pyinstaller` is used for compiling the `.exe`)*

### 3. Run the Application
```bash
python main.py
```
On first launch, `grb_data.xlsx` is created in the same directory, pre-seeded with 4 salesmen, standard distribution areas, and sample bills.

---

## How to Build the Standalone Windows `.exe`

To run this app on any office Windows computer **without installing Python**:

### Option A: Quick Build using `build_exe.bat` (Recommended)
Double-click `build_exe.bat` in Windows Explorer, or run in Command Prompt:
```cmd
build_exe.bat
```
This batch script will:
1. Verify Python & pip
2. Install `requirements.txt`
3. Invoke PyInstaller with the optimal flags:
   ```cmd
   pyinstaller --noconfirm --onefile --windowed --name "GRB_Collection_Tracker" --add-data "excel_manager.py;." main.py
   ```
4. Output the ready-to-use standalone executable to:
   `dist\GRB_Collection_Tracker.exe`

### Option B: Manual Command
```bash
pip install -r requirements.txt
pyinstaller --onefile --windowed --name "GRB_Collection_Tracker" main.py
```
The resulting `dist/GRB_Collection_Tracker.exe` can be copied to a USB drive or Desktop.

---

## How to Build an Inno Setup Installer (.exe Wizard)

If you want a setup wizard that installs into `C:\Program Files\GRB Collection Tracker` with a desktop shortcut and uninstaller:
1. Download and install [Inno Setup 6](https://jrsoftware.org/isinfo.php) (Free & open-source).
2. Right-click `installer.iss` in this directory and select **Compile**.
3. The setup wizard `dist_installer\GRB_Collection_Tracker_Setup.exe` will be generated.

---

## Backing Up Your Data
All business data lives in `grb_data.xlsx`. To back up:
1. Simply copy `grb_data.xlsx` to Google Drive, a USB pen drive, or an external folder.
2. The file can be opened directly in Microsoft Excel or LibreOffice Calc at any time for manual inspection or reporting.
