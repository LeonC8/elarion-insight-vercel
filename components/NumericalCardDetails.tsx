import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { XIcon, DownloadIcon, BarChartIcon, TableIcon } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { ResponsivePie } from '@nivo/pie'
import { format, addDays } from 'date-fns'
import * as XLSX from 'xlsx'
import { useState } from 'react'

interface CustomDialogProps {
  selectedCard: string | null;  
  closeDialog: () => void;
  selectedTimeframe: string;
  comparisonType: 'Last year' | 'Budget' | 'No comparison';
  pieChartData?: Array<{ id: string; value: number }>;
  comparisonPieChartData?: Array<{ id: string; value: number }>;
  customData?: Array<{ date: string; value: number; comparison?: number }>;
}

const COLORS = ['rgba(59, 130, 246, 0.5)', 'rgba(34, 197, 94, 0.5)', 'rgba(234, 179, 8, 0.5)', 'rgba(239, 68, 68, 0.5)']

const modernTheme = {
  // ... (keep the existing modernTheme object)
}

// Add this interface for better type safety
interface ChartData {
  date: string;
  value: number;
  comparison?: number;
}

interface PieData {
  id: string;
  value: number;
}

// Update the exportToExcel function
const exportToExcel = (
  lineChartData: ChartData[],
  cardTitle: string,
  timeframe: string,
  comparisonType: 'Last year' | 'Budget' | 'No comparison',
  comparisonPieChartData?: PieData[],
  pieChartData?: PieData[],
) => {
  const wb = XLSX.utils.book_new();

  // Fluctuation Sheet
  const fluctuationData = [
    ['Fluctuation', ''],
    ['Date', 'Value'],
    ...lineChartData.map(item => [
      item.date,
      item.value
    ])
  ];

  if (comparisonType !== 'No comparison') {
    fluctuationData[1].push('Comparison');
    fluctuationData.slice(2).forEach((row, index) => {
      row.push(lineChartData[index].comparison ?? 0);
    });
  }

  const wsFluctuation = XLSX.utils.aoa_to_sheet(fluctuationData);

  // Distribution Sheet (if pie chart data exists)
  if (pieChartData) {
    const distributionData = [
      ['Distribution', ''],
      ['Category', 'Value'],
      ...pieChartData.map(item => [
        item.id,
        item.value
      ])
    ];

    if (comparisonType !== 'No comparison' && comparisonPieChartData) {
      distributionData[1].push('Comparison Value');
      distributionData.slice(2).forEach((row, index) => {
        row.push(comparisonPieChartData[index]?.value || 'N/A');
      });
    }

    const wsDistribution = XLSX.utils.aoa_to_sheet(distributionData);
    XLSX.utils.book_append_sheet(wb, wsDistribution, 'Distribution');
  }

  // Add Fluctuation sheet
  XLSX.utils.book_append_sheet(wb, wsFluctuation, 'Fluctuation');

  // Generate filename
  const filename = `${cardTitle}_${timeframe.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  
  // Write the file
  XLSX.writeFile(wb, filename);
};

export function CustomDialog({
  selectedCard,
  closeDialog,
  selectedTimeframe,
  comparisonType,
  pieChartData,
  comparisonPieChartData,
  customData
}: CustomDialogProps) {
  const [showLineChartTable, setShowLineChartTable] = useState(false)
  const [showPieChartTable, setShowPieChartTable] = useState(false)

  const getDisplayTimeframe = (timeframe: string) => {
    return /\d/.test(timeframe) ? "Custom period" : timeframe;
  };

  // Simplified mock data generation
  const generateData = () => {
    if (customData) {
      return customData;
    }
    return Array.from({ length: 30 }, (_, i) => ({
      date: format(addDays(new Date(), i), 'MMM dd'),
      value: Math.floor(Math.random() * 50) + 50,
      comparison: Math.floor(Math.random() * 40) + 40
    }));
  };

  const data = generateData();

  const LineChartTable = ({ data }: { data: any[] }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
            {comparisonType !== 'No comparison' && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comparison</th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.date}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.value}</td>
              {comparisonType !== 'No comparison' && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.comparison}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const PieChartTable = ({ data, comparisonData }: { data: any[], comparisonData?: any[] }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Value</th>
            {comparisonData && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comparison Value</th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.value}</td>
              {comparisonData && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comparisonData[index]?.value || 'N/A'}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <AnimatePresence>
      {selectedCard && (
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
            className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 shadow-sm border-b border-gray-200 p-6">
              <div className="flex justify-between items-center mb-0">
                <h2 className="text-xl font-semibold">{selectedCard}</h2>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    onClick={() => exportToExcel(
                      data,
                      selectedCard,
                      selectedTimeframe,
                      comparisonType,
                      comparisonPieChartData,
                      pieChartData,
                    )}
                    className="flex items-center space-x-3 text-blue-600"
                  >
                    <DownloadIcon className="h-4 w-4" />
                    <span>Export to Excel</span>
                  </Button>
                  <Button variant="ghost" className='bg-gray-100 rounded-lg' onClick={closeDialog}>
                    <XIcon className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-6 bg-gray-100">
              {/* Summary Section */}
              <div className="mb-4 border border-gray-200 p-6 shadow-sm  rounded-lg bg-white">
                {/* <h3 className="text-lg font-semibold mb-8">Summary</h3> */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">   
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500 mb-2">
                      {getDisplayTimeframe(selectedTimeframe)}
                    </span>
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-gray-900">
                        €{data.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                      </span>
                      {comparisonType !== 'No comparison' && (
                        <div className={`ml-4 text-sm font-medium ${
                          data.reduce((sum, item) => sum + item.value, 0) >= 
                          data.reduce((sum, item) => sum + (item.comparison || 0), 0)
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {((data.reduce((sum, item) => sum + item.value, 0) / 
                            data.reduce((sum, item) => sum + (item.comparison || 0), 0) - 1) * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>

                  {comparisonType !== 'No comparison' && (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500 mb-2">
                        {`${getDisplayTimeframe(selectedTimeframe)} ${comparisonType === 'Last year' ? 'STLY' : 'Budget'}`}
                      </span>
                      <span className="text-3xl font-bold text-gray-900">
                        €{data.reduce((sum, item) => sum + (item.comparison || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Fluctuation Section */}
              <div className="mb-4 border border-gray-200 p-6 shadow-sm rounded-lg bg-white">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold mb-5">Fluctuation</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      className={`text-sm px-3 py-1 rounded-full flex items-center transition-colors ${
                        !showLineChartTable
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      onClick={() => setShowLineChartTable(false)}
                    >
                      <BarChartIcon className="w-4 h-4 mr-1" />
                      Chart
                    </button>
                    <button
                      className={`text-sm px-3 py-1 rounded-full flex items-center transition-colors ${
                        showLineChartTable
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      onClick={() => setShowLineChartTable(true)}
                    >
                      <TableIcon className="w-4 h-4 mr-1" />
                      Table
                    </button>
                  </div>
                </div>

                {!showLineChartTable ? (
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {comparisonType === 'No comparison' ? (
                        <AreaChart
                          data={data}
                          margin={{ top: 20, right: 20, left: -20, bottom: 20 }}
                        >
                          <CartesianGrid horizontal={true} vertical={false} />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ dy: 15, fontSize: 11, fill: "#999", fontWeight: 500 }}
                          />
                          <YAxis
                            domain={[0, 'dataMax']}
                            axisLine={false}
                            tickLine={false}
                            tick={{ dx: -15, fontSize: 11, fill: "#999", fontWeight: 500 }}
                          />
                          <Tooltip />
                          <Area 
                            type="monotone"
                            dataKey="value"
                            stroke="#60a5fa"
                            strokeWidth={2}
                            fill="#60a5fa"
                            fillOpacity={0.1}
                            dot={false}
                            activeDot={{ r: 8 }}
                            name="Value"
                          />
                        </AreaChart>
                      ) : (
                        <LineChart
                          data={data}
                          margin={{ top: 20, right: 20, left: -20, bottom: 40 }}
                        >
                          <CartesianGrid horizontal={true} vertical={false} />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ dy: 15, fontSize: 11, fill: "#999", fontWeight: 500 }}
                          />
                          <YAxis
                            domain={[0, 'dataMax']}
                            axisLine={false}
                            tickLine={false}
                            tick={{ dx: -15, fontSize: 11, fill: "#999", fontWeight: 500 }}
                          />
                          <Tooltip />
                          <Line 
                            type="monotone"
                            dataKey="value"
                            stroke="#60a5fa"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 8 }}
                            name="Current"
                          />
                          <Line 
                            type="monotone"
                            dataKey="comparison"
                            stroke="#82ca9d"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 8 }}
                            name="Comparison"
                          />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <LineChartTable data={data} />
                )}
              </div>

              {/* Distribution Section */}
              {pieChartData && (
                <div className="mt-0 border border-gray-200 p-6 shadow-sm rounded-lg bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold mb-5">Distribution</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        className={`text-sm px-3 py-1 rounded-full flex items-center transition-colors ${
                          !showPieChartTable
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        onClick={() => setShowPieChartTable(false)}
                      >
                        <BarChartIcon className="w-4 h-4 mr-1" />
                        Chart
                      </button>
                      <button
                        className={`text-sm px-3 py-1 rounded-full flex items-center transition-colors ${
                          showPieChartTable
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        onClick={() => setShowPieChartTable(true)}
                      >
                        <TableIcon className="w-4 h-4 mr-1" />
                        Table
                      </button>
                    </div>
                  </div>

                  {!showPieChartTable ? (
                    <div className={`flex ${comparisonType !== 'No comparison' ? 'justify-between' : 'justify-center'}`}>
                      <div className="flex flex-col items-center" style={{ width: comparisonType !== 'No comparison' ? '48%' : '60%' }}>
                        <div style={{ height: 300, width: '100%' }}>
                          <ResponsivePie
                            data={pieChartData}
                            margin={{ top: 40, right: 80, bottom: 60, left: 80 }}
                            innerRadius={0.5}
                            padAngle={0.7}
                            cornerRadius={3}
                            activeOuterRadiusOffset={8}
                            colors={COLORS}
                            borderWidth={1}
                            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                            arcLinkLabelsSkipAngle={10}
                            arcLinkLabelsTextColor="#666666"
                            arcLinkLabelsThickness={2}
                            arcLinkLabelsColor={{ from: 'color' }}
                            arcLabelsSkipAngle={10}
                            arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                            arcLabel={d => `${Math.round((d.value / pieChartData.reduce((sum, item) => sum + item.value, 0)) * 100)}%`}
                            tooltip={({ datum }) => (
                              <div
                                style={{
                                  background: 'white',
                                  padding: '9px 12px',
                                  border: '1px solid #ccc',
                                  borderRadius: '4px',
                                }}
                              >
                                <strong>{datum.id}</strong>: {datum.value.toLocaleString()} 
                                ({Math.round((datum.value / pieChartData.reduce((sum, item) => sum + item.value, 0)) * 100)}%)
                              </div>
                            )}
                            theme={modernTheme}
                          />
                        </div>
                        <span className="text-sm text-gray-500 mt-2">
                          {getDisplayTimeframe(selectedTimeframe)}
                        </span>
                      </div>

                      {comparisonType !== 'No comparison' && comparisonPieChartData && (
                        <div className="flex flex-col items-center" style={{ width: '48%' }}>
                          <div style={{ height: 300, width: '100%' }}>
                            <ResponsivePie
                              data={comparisonPieChartData}
                              margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                              innerRadius={0.5}
                              padAngle={0.7}
                              cornerRadius={3}
                              activeOuterRadiusOffset={8}
                              colors={COLORS}
                              borderWidth={1}
                              borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                              arcLinkLabelsSkipAngle={10}
                              arcLinkLabelsTextColor="#666666"
                              arcLinkLabelsThickness={2}
                              arcLinkLabelsColor={{ from: 'color' }}
                              arcLabelsSkipAngle={10}
                              arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                              arcLabel={d => `${Math.round((d.value / comparisonPieChartData.reduce((sum, item) => sum + item.value, 0)) * 100)}%`}
                              tooltip={({ datum }) => (
                                <div
                                  style={{
                                    background: 'white',
                                    padding: '9px 12px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                  }}
                                >
                                  <strong>{datum.id}</strong>: {datum.value.toLocaleString()} 
                                  ({Math.round((datum.value / comparisonPieChartData.reduce((sum, item) => sum + item.value, 0)) * 100)}%)
                                </div>
                              )}
                              theme={modernTheme}
                            />
                          </div>
                          <span className="text-sm text-gray-500 mt-2">
                            {`${getDisplayTimeframe(selectedTimeframe)} ${comparisonType === 'Last year' ? 'STLY' : 'Budget'}`}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <PieChartTable 
                      data={pieChartData} 
                      comparisonData={comparisonType !== 'No comparison' ? comparisonPieChartData : undefined} 
                    />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
