# Stock Price Movement Predictor

## Overview
This project develops a machine learning model to predict the next-day price direction (Up or Down) of the S&P 500 ETF (SPY). It compares models trained on raw price/volume features against models trained on engineered technical indicators, as well as against naive baselines (Persistence and Majority-Class).

## Features
- **Data Fetching:** Automatically downloads daily OHLCV data using `yfinance`.
- **Leak-Free Target Construction:** Implements strict data shifting to ensure the model uses only today's data to predict tomorrow's direction, avoiding data leakage.
- **Feature Engineering:** Calculates multiple technical indicators using the `ta` library:
  - Simple Moving Average (SMA)
  - Exponential Moving Average (EMA)
  - Relative Strength Index (RSI)
  - Moving Average Convergence Divergence (MACD)
  - Average True Range (ATR)
  - Bollinger Bands
- **Time-Based Evaluation:** Uses a chronological train-test split (80/20) and fits scalers exclusively on the training set to prevent look-ahead bias.
- **Model Comparison:** Evaluates models based on Accuracy, Precision, Recall, and F1-score, comparing Random Forest classifiers (raw vs. engineered features) alongside naive baselines.

## Setup and Usage
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Open the Jupyter Notebook:
   ```bash
   jupyter notebook stock_predictor.ipynb
   ```
3. Run all cells in the notebook sequentially.

## Key Findings
- Financial time-series prediction requires careful construction of target variables to ensure that the prediction for $t+1$ does not inadvertently use data from $t+1$.
- Models evaluated on chronological splits often perform significantly differently (and more realistically) than those evaluated with random splits.
- Adding technical indicators allows the Random Forest model to capture non-linear market trends, momentum, and volatility patterns better than raw price and volume data alone. Check the generated four-way comparison table in the notebook for specific metrics.
