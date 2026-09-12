import React, { useState } from "react";
import { StockMarketTrackerChart } from "./components/stock-market-tracker-chart";
import { ChevronUp, ChevronDown, Activity } from "lucide-react";

// Using Unsplash placeholders for company logos
const STOCKS = [
  {
    ticker: "GOOG",
    name: "Alphabet, Inc.",
    logo: "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=64&h=64&fit=crop",
    price: "156.06",
    change: 4.9,
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    logo: "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=64&h=64&fit=crop",
    price: "19270.30",
    change: -1.2,
  },
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    logo: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=64&h=64&fit=crop",
    price: "217.80",
    change: 2.66,
  },
  {
    ticker: "SBUX",
    name: "Starbucks Corporation",
    logo: "https://images.unsplash.com/photo-1542181961-9590d0c79ec1?w=64&h=64&fit=crop",
    price: "97.73",
    change: 1.13,
  },
  {
    ticker: "NKE",
    name: "Nike, Inc.",
    logo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=64&h=64&fit=crop",
    price: "63.29",
    change: -3.61,
  },
];

export default function App() {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async (ticker: string) => {
    setSelectedStock(ticker);
    setLoading(true);
    setPredictionData(null);
    try {
      const res = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const data = await res.json();
      setPredictionData(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-6 md:p-12 font-sans flex flex-col items-center">
      <div className="w-full max-w-[480px]">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Activity className="text-blue-500" /> Stock Predictor Pro
        </h1>

        <div className="flex flex-col gap-3">
          {STOCKS.map((stock) => (
            <div
              key={stock.ticker}
              className="flex items-center justify-between p-4 bg-[#1a1c23] border border-white/5 rounded-2xl hover:bg-[#22252e] transition-colors"
            >
              <div className="flex items-center gap-4">
                <img
                  src={stock.logo}
                  alt={stock.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-bold text-lg leading-tight">
                    {stock.ticker}
                  </h3>
                  <p className="text-xs text-muted-foreground">{stock.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="font-bold">{stock.price}</div>
                  <div
                    className={`flex items-center text-xs font-semibold ${
                      stock.change >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {stock.change >= 0 ? (
                      <ChevronUp className="w-3 h-3 mr-0.5" />
                    ) : (
                      <ChevronDown className="w-3 h-3 mr-0.5" />
                    )}
                    {Math.abs(stock.change)}%
                  </div>
                </div>

                <button
                  onClick={() => handlePredict(stock.ticker)}
                  className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold py-1.5 px-4 rounded-xl transition-colors"
                >
                  Predict
                </button>
              </div>
            </div>
          ))}
        </div>

        {selectedStock && (
          <div className="mt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : predictionData ? (
              <div>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 bg-[#1a1c23] p-4 rounded-xl border border-white/5 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      T+1 Prediction
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        predictionData.prediction === "Up"
                          ? "text-emerald-500"
                          : "text-rose-500"
                      }`}
                    >
                      {predictionData.prediction}
                    </p>
                  </div>
                  <div className="flex-1 bg-[#1a1c23] p-4 rounded-xl border border-white/5 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      RF Accuracy
                    </p>
                    <p className="text-2xl font-bold">{predictionData.accuracy}</p>
                  </div>
                </div>
                {/* The chart component we integrated */}
                <StockMarketTrackerChart />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
