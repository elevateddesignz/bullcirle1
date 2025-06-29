// src/components/dashboard/OrdersTable.tsx
import React from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface OrdersTableProps {
  orders: any[];
}

const OrdersTable: React.FC<OrdersTableProps> = ({ orders }) => {
  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No recent orders</p>
        <p className="text-sm">Your trading history will appear here</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'filled':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'canceled':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
      case 'new':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'filled':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50';
      case 'canceled':
      case 'cancelled':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50';
      case 'pending':
      case 'new':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/50';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600';
    }
  };

  return (
    <div className="space-y-3">
      {orders.slice(0, 5).map((order) => {
        const qty = parseFloat(order.qty || 0);
        const filledAvgPrice = parseFloat(order.filled_avg_price || 0);
        const isBuy = order.side?.toLowerCase() === 'buy';
        const total = qty * filledAvgPrice;

        return (
          <div
            key={order.id}
            className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-brand-primary/30 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  isBuy 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  {isBuy ? (
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{order.symbol}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {order.side?.toUpperCase()} {qty} shares
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(order.status)}`}>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(order.status)}
                  <span className="capitalize">{order.status}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Type</p>
                <p className="font-semibold text-gray-900 dark:text-white uppercase">
                  {order.type}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  {filledAvgPrice > 0 ? 'Filled Price' : 'Limit Price'}
                </p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {filledAvgPrice > 0 
                    ? `$${filledAvgPrice.toFixed(2)}`
                    : order.limit_price 
                      ? `$${parseFloat(order.limit_price).toFixed(2)}`
                      : 'Market'
                  }
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Total</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {total > 0 ? `$${total.toFixed(2)}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Time</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {new Date(order.submitted_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      
      {orders.length > 5 && (
        <div className="text-center pt-4">
          <button className="text-sm text-brand-primary hover:text-brand-primary/80 font-medium">
            View All Orders ({orders.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default OrdersTable;