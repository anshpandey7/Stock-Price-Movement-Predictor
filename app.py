import os
import pandas as pd
import yfinance as yf
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from ta.trend import SMAIndicator, EMAIndicator, MACD
from ta.momentum import RSIIndicator
from ta.volatility import AverageTrueRange, BollingerBands
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

def fetch_and_process_data(ticker):
    data = yf.download(ticker, period="2y", interval="1d")
    
    if len(data) == 0:
        raise ValueError(f"No data found for ticker {ticker}")
        
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = [col[0] for col in data.columns]
        
    data['Return'] = data['Close'].pct_change()
    data['High-Low'] = data['High'] - data['Low']
    data['Volume_Change'] = data['Volume'].pct_change()
    
    sma = SMAIndicator(close=data["Close"], window=20)
    data['SMA_20'] = sma.sma_indicator()
    
    ema = EMAIndicator(close=data["Close"], window=20)
    data['EMA_20'] = ema.ema_indicator()
    
    rsi = RSIIndicator(close=data["Close"], window=14)
    data['RSI_14'] = rsi.rsi()
    
    macd = MACD(close=data["Close"])
    data['MACD'] = macd.macd()
    data['MACD_Signal'] = macd.macd_signal()
    
    atr = AverageTrueRange(high=data["High"], low=data["Low"], close=data["Close"], window=14)
    data['ATR_14'] = atr.average_true_range()
    
    bb = BollingerBands(close=data["Close"], window=20, window_dev=2)
    data['BB_High'] = bb.bollinger_hband()
    data['BB_Low'] = bb.bollinger_lband()
    
    data['Target'] = (data['Close'].shift(-1) > data['Close']).astype(int)
    
    train_data = data.dropna()
    predict_data = data.dropna(subset=['SMA_20', 'BB_High']) 
    today_features = predict_data.iloc[[-1]]
    
    chart_data = data[['Close', 'SMA_20']].dropna().tail(100)
    chart_json = {
        'dates': [str(d.date()) for d in chart_data.index],
        'close': chart_data['Close'].tolist(),
        'sma': chart_data['SMA_20'].tolist()
    }
    
    return train_data, today_features, chart_json

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/explore')
def explore():
    return render_template('explore.html')

@app.route('/top_stocks', methods=['GET'])
def top_stocks():
    tickers = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN"]
    results = []
    try:
        for ticker in tickers:
            df = yf.download(ticker, period="5d", interval="1d", progress=False)
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [col[0] for col in df.columns]
            df = df.dropna()
            if len(df) >= 2:
                current_price = float(df['Close'].iloc[-1])
                prev_price = float(df['Close'].iloc[-2])
                pct_change = ((current_price - prev_price) / prev_price) * 100
                results.append({
                    "ticker": ticker,
                    "price": f"${current_price:.2f}",
                    "change": f"{pct_change:+.2f}%",
                    "isUp": pct_change >= 0
                })
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/stock/<ticker>')
def stock_details(ticker):
    return render_template('stock_details.html', ticker=ticker.upper())

@app.route('/chart_data', methods=['GET'])
def chart_data():
    ticker = request.args.get('ticker')
    period = request.args.get('period', '1m') # default to 1 month
    
    interval = '1d'
    yf_period = '1mo'
    
    if period == '1d':
        yf_period = '1d'
        interval = '5m'
    elif period == '1w':
        yf_period = '5d'
        interval = '15m'
    elif period == '1m':
        yf_period = '1mo'
    elif period == '3m':
        yf_period = '3mo'
    elif period == '1y':
        yf_period = '1y'
    elif period == '5y':
        yf_period = '5y'
        
    try:
        df = yf.download(ticker, period=yf_period, interval=interval, progress=False)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [col[0] for col in df.columns]
        df = df.dropna()
        
        chart_json = {
            'dates': [str(d.date()) if interval == '1d' else str(d) for d in df.index],
            'close': df['Close'].tolist()
        }
        return jsonify(chart_json)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/predict', methods=['POST'])
def predict():
    try:
        content = request.json
        ticker = content.get('ticker', 'SPY').upper()
        
        train_data, today_features, chart_json = fetch_and_process_data(ticker)
        
        eng_features = ['Close', 'Volume', 'Return', 'High-Low', 'Volume_Change', 
                        'SMA_20', 'EMA_20', 'RSI_14', 'MACD', 'MACD_Signal', 
                        'ATR_14', 'BB_High', 'BB_Low']
        
        X = train_data[eng_features]
        y = train_data['Target']
        
        split_idx = int(len(train_data) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
        
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        rf = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=5)
        rf.fit(X_train_scaled, y_train)
        
        test_preds = rf.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, test_preds)
        
        today_X = today_features[eng_features]
        today_X_scaled = scaler.transform(today_X)
        tomorrow_pred = rf.predict(today_X_scaled)[0]
        
        direction = "Up" if tomorrow_pred == 1 else "Down"
        
        current_price = float(today_features['Close'].iloc[-1])
        today_return = float(today_features['Return'].iloc[-1]) * 100
        today_volume = int(today_features['Volume'].iloc[-1])
        
        current_rsi = float(today_features['RSI_14'].iloc[-1])
        current_macd = float(today_features['MACD'].iloc[-1])
        current_sma = float(today_features['SMA_20'].iloc[-1])
        
        try:
            info = yf.Ticker(ticker).info
            company_name = info.get('longName', ticker)
            sector = info.get('sector', 'Unknown')
            summary = info.get('longBusinessSummary', 'No business summary available.')
            market_cap = info.get('marketCap', 0)
            pe_ratio = info.get('trailingPE', 0.0)
            high_52w = info.get('fiftyTwoWeekHigh', 0.0)
            low_52w = info.get('fiftyTwoWeekLow', 0.0)
            
            if market_cap >= 1e12:
                mc_str = f"${market_cap / 1e12:.2f}T"
            elif market_cap >= 1e9:
                mc_str = f"${market_cap / 1e9:.2f}B"
            elif market_cap >= 1e6:
                mc_str = f"${market_cap / 1e6:.2f}M"
            else:
                mc_str = "N/A"
        except Exception:
            company_name, sector, summary, mc_str = ticker, "Unknown", "No business summary available.", "N/A"
            pe_ratio, high_52w, low_52w = 0.0, 0.0, 0.0
        
        return jsonify({
            'ticker': ticker,
            'prediction': direction,
            'accuracy': f"{accuracy * 100:.0f}%",
            'currentPrice': f"{current_price:.2f}",
            'todayReturn': f"{today_return:+.2f}%",
            'todayVolume': f"{today_volume:,}",
            'company': {
                'name': company_name,
                'sector': sector,
                'summary': summary,
                'marketCap': mc_str,
                'peRatio': f"{pe_ratio:.2f}" if pe_ratio else "N/A",
                'high52w': f"${high_52w:.2f}" if high_52w else "N/A",
                'low52w': f"${low_52w:.2f}" if low_52w else "N/A"
            },
            'indicators': {
                'rsi': f"{current_rsi:.1f}",
                'macd': 'Bullish' if current_macd > 0 else 'Bearish',
                'sma20': f"{current_sma:.1f}"
            },
            'chartData': chart_json
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
