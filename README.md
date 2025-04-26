# SOLR Web Interface

A simple web interface for interacting with a SOLR backend.  
This project is divided into two parts:
- **Backend**: Flask server
- **Frontend**: Static website served using Python's HTTP server

---

## Project Structure

```
SOLR-WEB-INTERFACE/
├── backend/
│   ├── venv/              # Python virtual environment
│   ├── app.py             # Flask backend server
│   └── requirements.txt   # Backend Python dependencies
├── frontend/
│   ├── css/
│   │   └── styles.css     # Frontend styles
│   ├── js/
│   │   └── script.js      # Frontend scripts
│   └── index.html         # Main frontend page
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites
- Python 3 installed
- (Optional) A virtual environment tool like `venv`

---

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/your-username/SOLR-WEB-INTERFACE.git
cd SOLR-WEB-INTERFACE
```

### 2. Set up and run the backend server
```bash
cd backend
python3 -m venv venv       # (If virtual environment not already created)
source venv/bin/activate   # On Linux/Mac
venv\Scripts\activate      # On Windows
pip install -r requirements.txt
python3 app.py
```
This will start the Flask server (by default on `http://localhost:5000`).

---

### 3. Serve the frontend
Open a second terminal:

```bash
cd frontend
python3 -m http.server 8000
```
This will serve the frontend at `http://localhost:8000`.

---

## Usage

- Open your browser and go to [http://localhost:8000](http://localhost:8000).
- The frontend will communicate with the backend at [http://localhost:5000](http://localhost:5000).

---

## Notes
- Make sure both servers (backend and frontend) are running simultaneously.
- If the ports `5000` or `8000` are occupied, you may need to choose different ones and update your frontend accordingly.

---

## License

This project is licensed under the MIT License.
