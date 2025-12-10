import React from 'react';
import { Transaction } from '../types';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, ScatterChart, Scatter, ZAxis, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '../utils';

interface DynamicChartProps {
    suggestion: {
        chartType: string;
        title: string;
        description: string;
        dataPoints: string[];
    };
    transactions: Transaction[];
}

export const DynamicChart: React.FC<DynamicChartProps> = ({ suggestion, transactions }) => {
    const chartData = React.useMemo(() => {
        const chartType = suggestion.chartType.toLowerCase();
        const title = suggestion.title.toLowerCase();
        const description = suggestion.description.toLowerCase();
        const combined = `${chartType} ${title} ${description} `.toLowerCase();

        // Debug logging
        console.log('🎨 Chart Generation Debug:');
        console.log('Type:', suggestion.chartType);
        console.log('Title:', suggestion.title);
        console.log('Description:', suggestion.description);
        console.log('Combined search string:', combined);

        const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#84cc16', '#14b8a6', '#f97316'];

        // 1. HEATMAP variations - hour/day patterns
        if (combined.includes('heatmap') || combined.includes('hour') || combined.includes('day-of-week') || combined.includes('day of week')) {
            if (combined.includes('hour') || combined.includes('time of day') || combined.includes('hourly')) {
                console.log('✅ Detected: Hour-of-day heatmap');
                const hourlySpend: Record<string, number> = {};
                for (let i = 0; i < 24; i++) hourlySpend[`${i}:00`] = 0;

                transactions.forEach(t => {
                    if (t.type === 'debit' && t.date) {
                        const hour = new Date(t.date).getHours();
                        hourlySpend[`${hour}:00`] += Math.abs(t.amount);
                    }
                });
                return Object.entries(hourlySpend).map(([name, value], index) => ({ name, value, color: COLORS[index % COLORS.length] }));
            }

            console.log('✅ Detected: Day-of-week heatmap');
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const daySpend: Record<string, number> = {};
            dayNames.forEach(d => daySpend[d] = 0);

            transactions.forEach(t => {
                if (t.type === 'debit' && t.date) {
                    const day = dayNames[new Date(t.date).getDay()];
                    daySpend[day] += Math.abs(t.amount);
                }
            });
            return Object.entries(daySpend).map(([name, value], index) => ({ name, value, color: COLORS[index % COLORS.length] }));
        }

        // 2. SCATTER / BUBBLE CHART - Multiple types
        if (combined.includes('scatter') || combined.includes('bubble') || combined.includes('frequency') || combined.includes('velocity') || combined.includes('size vs')) {

            // 2a. TEMPORAL DENSITY - Time between transactions
            if (combined.includes('temporal') || combined.includes('density') || combined.includes('time between')) {
                console.log('✅ Detected: Scatter - Transaction Value vs Temporal Density');

                // Sort transactions by date
                const sortedTransactions = [...transactions]
                    .filter(t => t.type === 'debit' && t.date)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                // Calculate temporal density (avg hours between transactions around each transaction)
                const temporalData = sortedTransactions.map((t, idx) => {
                    if (idx === 0 || idx === sortedTransactions.length - 1) return null;

                    const prevTime = new Date(sortedTransactions[idx - 1].date).getTime();
                    const currTime = new Date(t.date).getTime();
                    const nextTime = new Date(sortedTransactions[idx + 1].date).getTime();

                    const gapBefore = (currTime - prevTime) / (1000 * 60 * 60); // hours
                    const gapAfter = (nextTime - currTime) / (1000 * 60 * 60); // hours
                    const avgGap = (gapBefore + gapAfter) / 2;

                    return {
                        name: t.category.split('-')[0].trim(),
                        value: avgGap, // Temporal density (hours between transactions)
                        amount: Math.abs(t.amount) // Transaction value
                    };
                }).filter(Boolean) as Array<{ name: string; value: number; amount: number }>;

                // Group by amount buckets for better visualization
                const bucketSize = 50000;
                const buckets = new Map<string, { totalDensity: number; count: number }>();

                temporalData.forEach(item => {
                    const bucket = Math.floor(item.amount / bucketSize) * bucketSize;
                    const key = `₹${bucket}`;
                    const existing = buckets.get(key) || { totalDensity: 0, count: 0 };
                    existing.totalDensity += item.value;
                    existing.count += 1;
                    buckets.set(key, existing);
                });

                return Array.from(buckets.entries())
                    .map(([name, data]) => ({
                        name,
                        value: data.totalDensity / data.count // Avg temporal density for this value range
                    }))
                    .sort((a, b) => {
                        const aVal = parseInt(a.name.replace('₹', ''));
                        const bVal = parseInt(b.name.replace('₹', ''));
                        return aVal - bVal;
                    })
                    .slice(0, 15);
            }

            // 2b. FREQUENCY vs VALUE - Category analysis
            console.log('✅ Detected: Scatter/Bubble chart - Frequency vs Value by Category');

            const categoryStats = new Map<string, { count: number; totalAmount: number }>();

            transactions.forEach(t => {
                if (t.type === 'debit') {
                    const cat = t.category.split('-')[0].trim();
                    const stats = categoryStats.get(cat) || { count: 0, totalAmount: 0 };
                    stats.count += 1;
                    stats.totalAmount += Math.abs(t.amount);
                    categoryStats.set(cat, stats);
                }
            });

            return Array.from(categoryStats.entries())
                .map(([name, stats]) => ({
                    name,
                    value: stats.count, // Frequency as main value (bar height)
                    avgValue: stats.totalAmount / stats.count // Average transaction value (for reference)
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 15); // Top 15 categories
        }

        // 3. WEEKDAY vs WEEKEND comparison
        if (combined.includes('weekday') || combined.includes('weekend') || combined.includes('week day')) {
            console.log('✅ Detected: Weekday vs Weekend');
            const weekdayTotal = transactions.filter(t => {
                const day = new Date(t.date).getDay();
                return t.type === 'debit' && day >= 1 && day <= 5;
            }).reduce((sum, t) => sum + Math.abs(t.amount), 0);

            const weekendTotal = transactions.filter(t => {
                const day = new Date(t.date).getDay();
                return t.type === 'debit' && (day === 0 || day === 6);
            }).reduce((sum, t) => sum + Math.abs(t.amount), 0);

            return [
                { name: 'Weekday', value: weekdayTotal, color: COLORS[0] },
                { name: 'Weekend', value: weekendTotal, color: COLORS[1] }
            ];
        }

        // 4. MERCHANTS / VENDORS
        if (combined.includes('merchant') || combined.includes('vendor') || combined.includes('top spend')) {
            console.log('✅ Detected: Merchant analysis');
            const merchantMap = new Map<string, number>();
            transactions.forEach(t => {
                if (t.type === 'debit') {
                    const merchant = t.description.split(' ').slice(0, 2).join(' ');
                    merchantMap.set(merchant, (merchantMap.get(merchant) || 0) + Math.abs(t.amount));
                }
            });

            return Array.from(merchantMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)
                .map(([name, value], index) => ({ name, value, color: COLORS[index % COLORS.length] }));
        }

        // 5. MONTHLY / TIME SERIES / TRENDS
        if (combined.includes('monthly') || combined.includes('cumulative') || combined.includes('over time') ||
            combined.includes('trend') || chartType.includes('area') || chartType.includes('line')) {
            console.log('✅ Detected: Time series/Monthly trend');
            const monthlyMap = new Map<string, number>();
            transactions.forEach(t => {
                if (t.type === 'debit' && t.date) {
                    const date = new Date(t.date);
                    const key = `${date.toLocaleDateString('default', { month: 'short' })} ${date.getFullYear()} `;
                    monthlyMap.set(key, (monthlyMap.get(key) || 0) + Math.abs(t.amount));
                }
            });

            return Array.from(monthlyMap.entries())
                .map(([name, value], index) => ({ name, value, color: COLORS[index % COLORS.length] }))
                .slice(-12); // Last 12 months
        }

        // 6. CATEGORY DISTRIBUTION (Pie/Donut/Treemap)
        if (chartType.includes('pie') || chartType.includes('donut') || chartType.includes('treemap') ||
            combined.includes('category') || combined.includes('distribution') || combined.includes('breakdown')) {
            console.log('✅ Detected: Category distribution');
            const categoryMap = new Map<string, number>();
            transactions.forEach(t => {
                if (t.type === 'debit') {
                    const cat = t.category.split('-')[0].trim();
                    categoryMap.set(cat, (categoryMap.get(cat) || 0) + Math.abs(t.amount));
                }
            });

            return Array.from(categoryMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([name, value], index) => ({ name, value, color: COLORS[index % COLORS.length] }));
        }

        // 7. DISTRIBUTION / BOX PLOT data - This section was removed as per the instruction.

        // 7. INCOME vs EXPENSES (Waterfall/Funnel/Cash Flow)
        if (combined.includes('waterfall') || combined.includes('funnel') || combined.includes('income') ||
            combined.includes('cash flow') || combined.includes('savings')) {
            console.log('✅ Detected: Income vs Expenses flow');
            const income = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
            const expense = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
            return [
                { name: 'Income', value: income, color: COLORS[0] },
                { name: 'Expenses', value: expense, color: COLORS[1] },
                { name: 'Net Savings', value: Math.max(0, income - expense), color: COLORS[2] }
            ];
        }

        // DEFAULT: Top categories by spending
        console.log('⚠️ Using default: Top categories');
        const categoryMap = new Map<string, number>();
        transactions.forEach(t => {
            if (t.type === 'debit') {
                const cat = t.category.split('-')[0].trim();
                categoryMap.set(cat, (categoryMap.get(cat) || 0) + Math.abs(t.amount));
            }
        });

        return Array.from(categoryMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, value], index) => ({ name, value, color: COLORS[index % COLORS.length] }));
    }, [suggestion, transactions]);

    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#84cc16', '#14b8a6', '#f97316'];
    const LegendAny = Legend as any;

    const renderChart = () => {
        const chartType = suggestion.chartType.toLowerCase();

        // Get axis labels from suggestion or use defaults
        const xAxisLabel = suggestion.dataPoints?.[0] || 'Category';
        const yAxisLabel = suggestion.dataPoints?.[1] || 'Amount (₹)';

        // PIE CHART
        if (chartType.includes('pie') || chartType.includes('donut')) {
            return (
                <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) => entry.name}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {chartData.map((entry: any, index: number) => (
                                <Cell key={`cell - ${index} `} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <LegendAny verticalAlign="top" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            );
        }

        // RADAR CHART
        if (chartType.includes('radar') || chartType.includes('spider')) {
            console.log('✅ Detected: Radar/Spider chart');
            const PolarAngleAxisAny = PolarAngleAxis as any;
            const PolarRadiusAxisAny = PolarRadiusAxis as any;
            const RadarAny = Radar as any;

            return (
                <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={chartData} margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxisAny dataKey="name" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxisAny angle={90} domain={[0, 'auto']} tick={{ fontSize: 10 }} />
                        <RadarAny name="Spending" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <LegendAny verticalAlign="top" height={36} />
                    </RadarChart>
                </ResponsiveContainer>
            );
        }

        // BUBBLE CHART - Scatter plot with varying bubble sizes
        if (chartType.includes('bubble')) {
            console.log('✅ Rendering: Bubble Chart');
            const ScatterAny = Scatter as any;

            // For bubble charts, we need numeric x/y coordinates and size (z)
            // Convert category names to numeric x indexes and keep mapping for ticks
            const nameToIndex: string[] = chartData.map((d: any) => d.name);
            const bubbleData = chartData.map((d: any, i: number) => ({
                x: i, // numeric x position
                y: d.value || d.amount || 0, // y value (frequency or total)
                z: d.avgValue || d.value || 100, // bubble size
                name: d.name,
                raw: d
            }));

            return (
                <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart data={bubbleData} margin={{ top: 20, right: 30, left: 80, bottom: 110 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            type="number"
                            dataKey="x"
                            domain={[0, Math.max(0, bubbleData.length - 1)]}
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            height={90}
                            tickFormatter={(val: number) => nameToIndex[Math.round(val)] || ''}
                            label={{ value: xAxisLabel, position: 'insideBottom', offset: -5, style: { fontSize: 11, fontWeight: 600, textAnchor: 'middle' } }}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => `₹${value / 1000}k`}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -60, style: { fontSize: 11, fontWeight: 600, textAnchor: 'middle' } }}
                        />
                        <ZAxis dataKey="z" range={[100, 1500]} />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none' }}
                            formatter={(value: any, name: string, props: any) => {
                                if (name === 'z') return [`Size: ${Math.round(value)}`, 'Size'];
                                if (name === 'y') return [formatCurrency(value), yAxisLabel];
                                return [value, name];
                            }}
                        />
                        <LegendAny verticalAlign="top" height={36} />
                        <ScatterAny name="Categories" dataKey="y" fill="#6366f1" shape="circle">
                            {bubbleData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </ScatterAny>
                    </ScatterChart>
                </ResponsiveContainer>
            );
        }

        // SCATTER CHART - Actual scatter plot with dots
        if (chartType.includes('scatter')) {
            console.log('✅ Rendering: Scatter Chart');
            const ScatterAny = Scatter as any;

            // Determine if this is a temporal chart
            const titleLower = suggestion.title.toLowerCase();
            const descLower = suggestion.description.toLowerCase();
            const isTemporal = titleLower.includes('temporal') || titleLower.includes('density') ||
                titleLower.includes('time between') || titleLower.includes('volatility') ||
                descLower.includes('temporal') || descLower.includes('density');

            // Convert hours to days for temporal charts
            const displayData = isTemporal
                ? chartData.map((d: any) => ({ ...d, value: d.value / 24 })) // Convert hours to days
                : chartData;

            return (
                <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart data={displayData} margin={{ top: 20, right: 30, left: 80, bottom: 110 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            angle={-45}
                            textAnchor="end"
                            height={90}
                            label={{ value: xAxisLabel, position: 'insideBottom', offset: -5, style: { fontSize: 11, fontWeight: 600, textAnchor: 'middle' } }}
                        />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => isTemporal ? `${Math.round(value)}d` : `₹${value / 1000}k`}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -60, style: { fontSize: 11, fontWeight: 600, textAnchor: 'middle' } }}
                        />
                        <Tooltip
                            formatter={(value: number) => isTemporal ? `${Math.round(value)} days` : formatCurrency(value)}
                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none' }}
                        />
                        <LegendAny verticalAlign="top" height={36} />
                        <ScatterAny name="Spending" dataKey="value" fill="#6366f1" />
                    </ScatterChart>
                </ResponsiveContainer>
            );
        }

        // LINE CHART
        if (chartType.includes('line') || chartType.includes('trend')) {
            return (
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 80, bottom: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            label={{ value: xAxisLabel, position: 'insideBottom', offset: -5, style: { fontSize: 11, fontWeight: 600, textAnchor: 'middle' } }}
                        />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => `₹${value / 1000} k`}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -60, style: { fontSize: 11, fontWeight: 600, textAnchor: 'middle' } }}
                        />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none' }} />
                        <LegendAny verticalAlign="top" height={36} />
                        <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Spending" />
                    </LineChart>
                </ResponsiveContainer>
            );
        }

        // AREA CHART
        if (chartType.includes('area')) {
            return (
                <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 80, bottom: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            label={{ value: xAxisLabel, position: 'insideBottom', offset: -5, style: { fontSize: 11, fontWeight: 600, textAnchor: 'middle' } }}
                        />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => `₹${value / 1000} k`}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -60, style: { fontSize: 11, fontWeight: 600, textAnchor: 'middle' } }}
                        />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none' }} />
                        <LegendAny verticalAlign="top" height={36} />
                        <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} name="Spending" />
                    </AreaChart>
                </ResponsiveContainer>
            );
        }

        // DEFAULT: BAR CHART with colorful bars
        return (
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 80, bottom: 110 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={90}
                        label={{ value: xAxisLabel, position: 'insideBottom', offset: -5, style: { fontSize: 11, fontWeight: 600, textAnchor: 'middle' } }}
                    />
                    <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => `₹${value / 1000} k`}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -60, style: { fontSize: 11, fontWeight: 600, textAnchor: 'middle' } }}
                    />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none' }} />
                    <LegendAny verticalAlign="top" height={36} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Spending">
                        {chartData.map((entry: any, index: number) => (
                            <Cell key={`cell - ${index} `} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        );
    };

    if (!chartData || chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <p>Not enough data to generate this chart.</p>
            </div>
        );
    }

    return (
        <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {renderChart()}
        </div>
    );
};
