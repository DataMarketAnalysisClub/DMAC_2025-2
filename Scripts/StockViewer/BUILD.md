# BUILD.md: Macro-Equity Terminal Project

## System Overview
This project is a high-density, terminal-inspired visualization application designed to correlate macroeconomic indicators with granular equity data across the US and Chilean markets. 

**Core Engineering Challenge:** The system must handle disparate data frequencies, asynchronous external API dependencies, and real-time currency normalization without compromising UI responsiveness. A decoupled architecture is strictly required; synchronous, single-threaded processing will cause UI lockups and critical failures.

---

## Architecture & Tech Stack

* **Frontend (View Layer):** Dart/Flutter or React. Essential for handling a modular grid system, high information density, and complex state management across dual-market toggles. 
* **Backend (API & Quant Engine):** Python (FastAPI/Flask) to leverage native data science libraries (`pandas`, `numpy`, `yfinance`) and econometrics logic.
* **Database (Relational):** PostgreSQL for managing user accounts, custom watchlists, portfolios, and rigid sector/industry mapping schemas.
* **Database (Cache & Queue):** Redis for caching fast-moving ticker data and managing background task queues.
* **Infrastructure:** Containerized deployment (Docker) hosted on scalable cloud infrastructure (e.g., Azure) to isolate the data ingestion pipelines from the frontend web server.

---

## Phase 1: Core Data Ingestion & Storage
Do not build the UI until the data pipelines are stable and fault-tolerant.

### 1.1 US Market Data
* **Equities:** `yfinance` implementation wrapped in robust error handling to mitigate sudden DOM breakages and rate limits. 
* **Macro:** Federal Reserve Economic Data (FRED) API.

### 1.2 Chilean Market Data
* **Equities:** Yahoo Finance `.SN` tickers. Expect sparse fundamental data.
* **Macro:** Banco Central de Chile (BCC) API. 

### 1.3 Data Pipeline Risks & Mitigations
* **Rate Limiting:** Implement aggressive database-level caching. The frontend should never request data directly from an external API. All requests hit the local database/cache first.
* **Task Workers:** Set up background workers (e.g., Celery) to run scheduled batch jobs pulling data asynchronously.

---

## Phase 2: Data Normalization Engine (Critical Path)
Comparing multi-national data requires strict mathematical normalization before rendering.

### 2.1 Currency & FX Synchronization
* **Requirement:** Maintain a continuous feed of the USD/CLP exchange rate.
* **Implementation:** Establish a global state base-currency toggle. All historical prices, market caps, and financial metrics must be dynamically converted utilizing the historical daily exchange rate, not the spot rate.

### 2.2 Time-Series Alignment
* **Requirement:** Reconcile mismatched reporting frequencies (daily stocks vs. monthly IPC vs. quarterly GDP).
* **Implementation:** The backend must handle nulls and apply forward-fill or interpolation techniques so the frontend charting library receives clean, uniform vectors.
* **Rebasing:** For comparative charting (e.g., IPSA vs. S&P 500), implement backend logic to rebase all series to an index of 100 on the selected start date.

---

## Phase 3: The View Engine & UI Implementation
Function over form. The interface must prioritize data density and keyboard navigability.

* **Global Context Toggle:** A highly visible workspace toggle to switch between US and Chile. This toggle must instantly filter search results, default currencies, and available macro indicators to prevent data misinterpretation.
* **Modular Dashboards:** Implement a drag-and-drop grid layout for comparative charting, key metrics (P/E, Market Cap, Dividend Yield), and sector/industry lists.
* **Command Line Hybrid:** Implement a keyboard-first command bar to jump between tickers and views rapidly.

---

## Phase 4: Advanced Analytics & Portfolios
Isolate computationally expensive operations from the primary web server.

* **Portfolio Tracking:** Allow users to build portfolios and track historical performance.
* **Quant Optimization Engine:** Integrate existing Markowitz Efficient Frontier models and stochastic simulation logic as an isolated microservice. Trigger these calculations via API endpoints to avoid blocking the main application thread.

---

## Phase 5: NLP & Sentiment (Deferred)
Scraping news and running sentiment analysis are resource-heavy and highly prone to failure. Push this to the final phase.

* **Execution:** Scrape headlines, parse expected vs. actual EPS, and run sentiment analysis strictly in asynchronous background queues. Store the processed sentiment scores as simple time-series data for the frontend to chart.