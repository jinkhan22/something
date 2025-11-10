import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

export function Dashboard() {
  const navigate = useNavigate();
  const { 
    appraisalHistory, 
    historyLoading, 
    historyError,
    loadHistory,
    clearError 
  } = useAppStore();

  // Load history data on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Calculate statistics from real data
  const statistics = useMemo(() => {
    const total = appraisalHistory.length;
    const completed = appraisalHistory.filter(a => a.status === 'complete').length;
    const drafts = appraisalHistory.filter(a => a.status === 'draft').length;
    
    // Market analysis statistics
    const withComparables = appraisalHistory.filter(a => 
      (a as any).hasComparables || (a as any).comparableCount > 0
    ).length;
    
    // Calculate average difference between calculated and insurance values
    const appraisalsWithAnalysis = appraisalHistory.filter(a => 
      (a as any).calculatedMarketValue && a.data.settlementValue
    );
    
    let avgDifference = 0;
    let avgDifferencePercentage = 0;
    
    if (appraisalsWithAnalysis.length > 0) {
      const totalDifference = appraisalsWithAnalysis.reduce((sum, a) => {
        const calculated = (a as any).calculatedMarketValue || 0;
        const insurance = a.data.settlementValue || a.data.marketValue || 0;
        return sum + (calculated - insurance);
      }, 0);
      
      avgDifference = totalDifference / appraisalsWithAnalysis.length;
      
      const totalPercentage = appraisalsWithAnalysis.reduce((sum, a) => {
        const calculated = (a as any).calculatedMarketValue || 0;
        const insurance = a.data.settlementValue || a.data.marketValue || 0;
        if (insurance === 0) return sum;
        return sum + ((calculated - insurance) / insurance * 100);
      }, 0);
      
      avgDifferencePercentage = totalPercentage / appraisalsWithAnalysis.length;
    }
    
    return { 
      total, 
      completed, 
      drafts, 
      withComparables,
      avgDifference,
      avgDifferencePercentage
    };
  }, [appraisalHistory]);

  // Handle navigation to new appraisal
  const handleNewAppraisal = () => {
    clearError();
    navigate('/new');
  };

  // Handle navigation to history
  const handleViewHistory = () => {
    clearError();
    navigate('/history');
  };

  // Render loading state
  if (historyLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Overview of your automotive appraisal workflow
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (historyError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Overview of your automotive appraisal workflow
          </p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-1">
                Failed to Load Dashboard Data
              </h3>
              <p className="text-red-700 mb-4">{historyError}</p>
              <button
                onClick={() => loadHistory()}
                className="btn-danger"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of your automotive appraisal workflow
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card card-hover fade-in">
          <div className="card-body flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Appraisals</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-lg">📄</span>
            </div>
          </div>
        </div>
        
        <div className="card card-hover fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="card-body flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.completed}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-lg">✅</span>
            </div>
          </div>
        </div>
        
        <div className="card card-hover fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="card-body flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Drafts</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.drafts}</p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 text-lg">📝</span>
            </div>
          </div>
        </div>

        <div className="card card-hover fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="card-body flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">With Market Analysis</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.withComparables}</p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-lg">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Market Analysis Statistics */}
      {statistics.withComparables > 0 && (
        <div className="card fade-in">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Market Analysis Overview</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                <p className="text-sm font-medium text-blue-700 mb-2">Average Value Difference</p>
                <p className={`text-3xl font-bold ${
                  statistics.avgDifference > 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {statistics.avgDifference > 0 ? '+' : ''}${Math.abs(statistics.avgDifference).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  {statistics.avgDifferencePercentage > 0 ? '+' : ''}{statistics.avgDifferencePercentage.toFixed(1)}% vs insurance value
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                <p className="text-sm font-medium text-purple-700 mb-2">Appraisals with Comparables</p>
                <p className="text-3xl font-bold text-purple-700">
                  {statistics.withComparables} / {statistics.total}
                </p>
                <p className="text-sm text-purple-600 mt-1">
                  {statistics.total > 0 ? ((statistics.withComparables / statistics.total) * 100).toFixed(0) : 0}% completion rate
                </p>
              </div>
            </div>

            {statistics.avgDifference > 0 && statistics.avgDifferencePercentage > 5 && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">💡</span>
                  <div>
                    <p className="font-medium text-green-900">Potential Undervaluation Detected</p>
                    <p className="text-sm text-green-700 mt-1">
                      On average, your market analysis shows vehicles are valued {statistics.avgDifferencePercentage.toFixed(1)}% 
                      higher than insurance valuations. This could indicate opportunities for better settlements.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="card fade-in">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={handleNewAppraisal}
              className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="text-2xl">📤</span>
              <div className="text-left">
                <p className="font-medium text-gray-900">Upload New PDF</p>
                <p className="text-sm text-gray-500">Start a new appraisal</p>
              </div>
            </button>
            
            <button 
              onClick={handleViewHistory}
              className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="text-2xl">📋</span>
              <div className="text-left">
                <p className="font-medium text-gray-900">View History</p>
                <p className="text-sm text-gray-500">Browse past appraisals</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Appraisals with Comparables */}
      {statistics.withComparables > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Market Analyses</h2>
            <button
              onClick={() => navigate('/history')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {appraisalHistory
                .filter(a => (a as any).hasComparables || (a as any).comparableCount > 0)
                .slice(0, 5)
                .map((appraisal) => (
                  <div 
                    key={appraisal.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/history/${appraisal.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {appraisal.data.year} {appraisal.data.make} {appraisal.data.model}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(appraisal as any).comparableCount || 0} comparables
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {(appraisal as any).calculatedMarketValue && (
                        <p className="text-sm font-medium text-purple-700">
                          ${(appraisal as any).calculatedMarketValue.toLocaleString()}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(appraisal.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Section - Show when there are appraisals */}
      {statistics.total > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {appraisalHistory.slice(0, 5).map((appraisal) => (
                <div 
                  key={appraisal.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/history/${appraisal.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      appraisal.status === 'complete' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {appraisal.data.year} {appraisal.data.make} {appraisal.data.model}
                      </p>
                      <p className="text-sm text-gray-500">
                        VIN: {appraisal.data.vin}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {new Date(appraisal.createdAt).toLocaleDateString()}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      appraisal.status === 'complete' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {appraisal.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {statistics.total > 5 && (
              <button
                onClick={handleViewHistory}
                className="w-full mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                View all {statistics.total} appraisals →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State - Show when no appraisals */}
      {statistics.total === 0 && (
        <div className="bg-white rounded-lg border">
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">🚗</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Welcome to Automotive Appraisal
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Get started by uploading your first PDF valuation report. 
              We support CCC One and Mitchell report formats.
            </p>
            <button
              onClick={handleNewAppraisal}
              className="btn-primary btn-lg"
            >
              Upload Your First Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}