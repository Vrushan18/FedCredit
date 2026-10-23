import React, { useState, useEffect } from 'react';
import { Cpu, Play, Terminal, Database, CheckCircle, TrendingUp, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '../api';

export default function TrainingView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      setLoading(true);
      const data = await api.getTrainingLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartLocalTrain() {
    try {
      setTraining(true);
      setTrainResult(null);
      const res = await api.triggerLocalTraining();
      setTrainResult(res);
      await fetchLogs();
    } catch (err) {
      alert(`Training error: ${err.message}`);
    } finally {
      setTraining(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Local AI Model & Federated Learning Console
          </h1>
          <p className="text-xs text-slate-500">
            Train models locally on Bank A partition (4,800 records) and participate in Flower FedAvg rounds
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchLogs}
            className="p-2 text-slate-600 hover:bg-white rounded-lg border border-slate-200 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleStartLocalTrain}
            disabled={training}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-2 shadow-xs transition disabled:opacity-50"
          >
            {training ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Fitting Model...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Local Model Training</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result Alert if just trained */}
      {trainResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Local Training Round {trainResult.round} Finished Successfully!</span>
          </div>
          <div className="flex items-center space-x-4 pt-1 font-mono text-emerald-800">
            <span>Accuracy: {(trainResult.accuracy * 100).toFixed(2)}%</span>
            <span>AUC: {trainResult.auc.toFixed(4)}</span>
            <span>Loss: {trainResult.loss.toFixed(4)}</span>
            <span>Dataset: {trainResult.samples} Samples</span>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Model Specs */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          <div className="flex items-center space-x-2 text-slate-700 font-semibold text-xs">
            <Cpu className="w-4 h-4 text-blue-600" />
            <span>Model Specifications</span>
          </div>
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Classifier:</span>
              <span className="font-mono font-medium">Logistic Regression</span>
            </div>
            <div className="flex justify-between">
              <span>Weights Shape:</span>
              <span className="font-mono">coef_ (1, 17), intercept_ (1,)</span>
            </div>
            <div className="flex justify-between">
              <span>Class Weight:</span>
              <span className="font-mono">balanced</span>
            </div>
          </div>
        </div>

        {/* Dataset Partition */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          <div className="flex items-center space-x-2 text-slate-700 font-semibold text-xs">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Bank A Skewed Partition</span>
          </div>
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Training Samples:</span>
              <span className="font-semibold text-slate-900">4,800 records</span>
            </div>
            <div className="flex justify-between">
              <span>Income Skew:</span>
              <span className="text-blue-700 font-medium">70% Below Median / 30% Above</span>
            </div>
            <div className="flex justify-between">
              <span>Common Test Set:</span>
              <span>2,400 reserved records</span>
            </div>
          </div>
        </div>

        {/* Flower Client Launcher */}
        <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-slate-300 font-semibold text-xs">
            <Terminal className="w-4 h-4 text-teal-400" />
            <span>Flower FL Client Command</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Run in terminal on Bank A laptop to participate in central FL rounds:
          </p>
          <div className="bg-black/60 p-2 rounded-lg font-mono text-[11px] text-teal-300 select-all border border-slate-800">
            python client.py
          </div>
        </div>

      </div>

      {/* Training Telemetry History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900">Training Telemetry Logs</h2>
          <span className="text-xs text-slate-400">{logs.length} rounds recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Round #</th>
                <th className="py-3 px-4">Samples</th>
                <th className="py-3 px-4">Local Loss</th>
                <th className="py-3 px-4">Local Accuracy</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-400 font-sans">
                    No local training runs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">Round {l.round}</td>
                    <td className="py-3 px-4 text-slate-600">{l.num_samples?.toLocaleString() || '4,800'}</td>
                    <td className="py-3 px-4 text-slate-600">{l.local_loss.toFixed(4)}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">
                      {(l.local_accuracy * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">
                      {l.timestamp ? new Date(l.timestamp).toLocaleString() : 'Recent'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
