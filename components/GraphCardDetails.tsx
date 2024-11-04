import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { XIcon, DownloadIcon } from 'lucide-react'
import * as XLSX from 'xlsx'

interface DetailedDialogProps {
  title: string;
  subtitle: string;
  closeDialog: () => void;
  selectedData: Array<{ id: string; value: number }>;
  comparisonData: Array<{ id: string; value: number }>;
}

export function DetailedDialog({
  title,
  subtitle,
  closeDialog,
  selectedData,
  comparisonData
}: DetailedDialogProps) {
  const TableComponent = ({ selectedData, comparisonData }: { selectedData: Array<{ id: string; value: number }>, comparisonData: Array<{ id: string; value: number }> }) => (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selection Period</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comparison Period</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {selectedData.map((item, index) => {
          const comparisonItem = comparisonData[index];
          const change = comparisonItem ? item.value - comparisonItem.value : 0;
          const changePercentage = comparisonItem ? ((change / comparisonItem.value) * 100).toFixed(2) : 'N/A';
          
          return (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{item.value.toLocaleString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {comparisonItem ? `€${comparisonItem.value.toLocaleString()}` : 'N/A'}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change !== 0 ? (
                  <>
                    {change > 0 ? '+' : ''}€{Math.abs(change).toLocaleString()} ({changePercentage}%)
                  </>
                ) : '-'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      selectedData.map((item, index) => {
        const comparisonItem = comparisonData[index];
        const change = comparisonItem ? item.value - comparisonItem.value : 0;
        const changePercentage = comparisonItem ? ((change / comparisonItem.value) * 100).toFixed(2) : 'N/A';
        
        return {
          Category: item.id,
          'Selection Period': item.value,
          'Comparison Period': comparisonItem ? comparisonItem.value : 'N/A',
          Change: change !== 0 ? `${change > 0 ? '+' : ''}€${Math.abs(change)} (${changePercentage}%)` : '-'
        };
      })
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, `${title}.xlsx`);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={closeDialog}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg p-6 w-full max-w-4xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            </div>
            <div className="flex items-center">
              <Button 
                onClick={exportToExcel} 
                className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mr-2"
                variant="ghost"
              >
                <DownloadIcon className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
              <Button 
                variant="ghost" 
                onClick={closeDialog}
                className="bg-gray-100 hover:bg-gray-200 rounded-full p-2"
              >
                <XIcon className="h-6 w-6" />
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <TableComponent selectedData={selectedData} comparisonData={comparisonData} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}