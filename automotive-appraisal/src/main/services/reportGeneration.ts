import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MarketAnalysis, ReportOptions, ComparableVehicle, EquipmentAdjustment } from '../../types';

/**
 * ReportGenerationService generates professional market analysis reports
 * in HTML and PDF formats.
 */
export class ReportGenerationService {
  /**
   * Generate a market analysis report.
   * 
   * @param marketAnalysis - Market analysis data
   * @param options - Report generation options
   * @returns Result with file path or error
   */
  async generateMarketAnalysisReport(
    marketAnalysis: MarketAnalysis,
    options: ReportOptions
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Generate HTML content
      const html = this.generateReportHTML(marketAnalysis, options);

      // Determine output path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `market-analysis-${marketAnalysis.appraisalId}-${timestamp}`;
      const outputDir = path.join(os.homedir(), '.automotive-appraisal', 'reports');

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      if (options.format === 'html') {
        // Save as HTML
        const filePath = path.join(outputDir, `${fileName}.html`);
        fs.writeFileSync(filePath, html, 'utf8');
        return { success: true, filePath };
      } else {
        // For PDF, we'll save HTML for now
        // In production, this would use a library like puppeteer or electron's printToPDF
        const filePath = path.join(outputDir, `${fileName}.html`);
        fs.writeFileSync(filePath, html, 'utf8');
        
        // TODO: Implement actual PDF conversion
        // This is a placeholder that returns HTML file
        // In production, use BrowserWindow.webContents.printToPDF() or puppeteer
        return { 
          success: true, 
          filePath,
          error: 'PDF generation not yet implemented. HTML report generated instead.'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating report'
      };
    }
  }

  /**
   * Generate HTML content for the report.
   * 
   * @param marketAnalysis - Market analysis data
   * @param options - Report options
   * @returns HTML string
   */
  private generateReportHTML(marketAnalysis: MarketAnalysis, options: ReportOptions): string {
    const sections: string[] = [];

    // Add CSS styles
    sections.push(this.generateStyles());

    // Add header
    sections.push(this.generateHeader(marketAnalysis));

    // Add summary section
    if (options.includeSummary) {
      sections.push(this.generateSummarySection(marketAnalysis));
    }

    // Add loss vehicle details
    sections.push(this.generateLossVehicleSection(marketAnalysis));

    // Add comparables list
    if (options.includeComparablesList) {
      sections.push(this.generateComparablesSection(marketAnalysis));
    }

    // Add detailed calculations
    if (options.includeDetailedCalculations) {
      sections.push(this.generateCalculationsSection(marketAnalysis));
    }

    // Add methodology
    if (options.includeMethodology) {
      sections.push(this.generateMethodologySection());
    }

    // Add footer
    sections.push(this.generateFooter());

    // Wrap in HTML document
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Market Analysis Report - ${marketAnalysis.appraisalId}</title>
</head>
<body>
  ${sections.join('\n')}
</body>
</html>
    `.trim();
  }

  /**
   * Generate CSS styles for the report.
   */
  private generateStyles(): string {
    return `
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
    background: #f5f5f5;
  }

  .report-container {
    background: white;
    padding: 40px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }

  .header {
    border-bottom: 3px solid #2563eb;
    padding-bottom: 20px;
    margin-bottom: 30px;
  }

  .header h1 {
    color: #1e40af;
    font-size: 28px;
    margin-bottom: 10px;
  }

  .header .meta {
    color: #666;
    font-size: 14px;
  }

  .section {
    margin-bottom: 40px;
  }

  .section h2 {
    color: #1e40af;
    font-size: 22px;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 2px solid #e5e7eb;
  }

  .section h3 {
    color: #374151;
    font-size: 18px;
    margin: 20px 0 10px 0;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin: 20px 0;
  }

  .summary-card {
    background: #f9fafb;
    padding: 20px;
    border-radius: 8px;
    border-left: 4px solid #2563eb;
  }

  .summary-card .label {
    font-size: 14px;
    color: #6b7280;
    margin-bottom: 5px;
  }

  .summary-card .value {
    font-size: 24px;
    font-weight: bold;
    color: #1e40af;
  }

  .summary-card.highlight {
    background: #dbeafe;
    border-left-color: #1e40af;
  }

  .summary-card.warning {
    background: #fef3c7;
    border-left-color: #f59e0b;
  }

  .summary-card.success {
    background: #d1fae5;
    border-left-color: #10b981;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
  }

  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }

  th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
  }

  tr:hover {
    background: #f9fafb;
  }

  .vehicle-info {
    background: #f9fafb;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
  }

  .vehicle-info dl {
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 10px;
  }

  .vehicle-info dt {
    font-weight: 600;
    color: #374151;
  }

  .vehicle-info dd {
    color: #6b7280;
  }

  .calculation-step {
    background: #f9fafb;
    padding: 15px;
    margin: 10px 0;
    border-left: 3px solid #2563eb;
    border-radius: 4px;
  }

  .calculation-step .step-number {
    font-weight: bold;
    color: #1e40af;
    margin-bottom: 5px;
  }

  .calculation-step .formula {
    font-family: 'Courier New', monospace;
    background: white;
    padding: 10px;
    margin: 10px 0;
    border-radius: 4px;
    overflow-x: auto;
  }

  .quality-score {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-weight: bold;
    font-size: 14px;
  }

  .quality-score.high {
    background: #d1fae5;
    color: #065f46;
  }

  .quality-score.medium {
    background: #fef3c7;
    color: #92400e;
  }

  .quality-score.low {
    background: #fee2e2;
    color: #991b1b;
  }

  .footer {
    margin-top: 60px;
    padding-top: 20px;
    border-top: 2px solid #e5e7eb;
    text-align: center;
    color: #6b7280;
    font-size: 12px;
  }

  /* Chart Styles */
  .chart-container {
    margin: 30px 0;
    padding: 20px;
    background: #f9fafb;
    border-radius: 8px;
  }

  .chart-stats {
    display: flex;
    gap: 30px;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #e5e7eb;
  }

  .stat {
    display: flex;
    flex-direction: column;
  }

  .stat-label {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .stat-value {
    font-size: 18px;
    font-weight: bold;
    color: #1e40af;
  }

  .chart {
    margin-top: 20px;
  }

  .chart-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }

  .chart-label {
    width: 200px;
    font-size: 13px;
    color: #374151;
    padding-right: 15px;
    flex-shrink: 0;
  }

  .chart-bar-container {
    flex: 1;
    background: #e5e7eb;
    border-radius: 4px;
    height: 32px;
    position: relative;
    overflow: hidden;
  }

  .chart-bar {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 10px;
    border-radius: 4px;
    transition: width 0.3s ease;
    position: relative;
  }

  .chart-bar.high {
    background: linear-gradient(90deg, #10b981, #059669);
  }

  .chart-bar.medium {
    background: linear-gradient(90deg, #f59e0b, #d97706);
  }

  .chart-bar.low {
    background: linear-gradient(90deg, #ef4444, #dc2626);
  }

  .chart-value {
    color: white;
    font-weight: bold;
    font-size: 12px;
    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }

  .quality-distribution {
    margin: 20px 0;
  }

  .distribution-bar {
    display: flex;
    height: 50px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .distribution-segment {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 14px;
    transition: all 0.3s ease;
  }

  .distribution-segment.high {
    background: #10b981;
  }

  .distribution-segment.medium {
    background: #f59e0b;
  }

  .distribution-segment.low {
    background: #ef4444;
  }

  .segment-label {
    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }

  .adjustment-details {
    background: #f9fafb;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
    border-left: 4px solid #2563eb;
  }

  .adjustment-details h4 {
    color: #1e40af;
    margin-bottom: 15px;
  }

  .adjustment-item {
    margin: 15px 0;
    padding: 10px 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .adjustment-item:last-of-type {
    border-bottom: none;
  }

  .adjustment-item strong {
    color: #374151;
    display: block;
    margin-bottom: 5px;
  }

  .adjustment-item p {
    color: #6b7280;
    margin: 5px 0;
  }

  .adjustment-item ul {
    margin: 10px 0 0 20px;
    color: #6b7280;
  }

  .adjustment-value {
    font-weight: bold;
    color: #1e40af;
  }

  .adjustment-total {
    display: flex;
    justify-content: space-between;
    padding: 15px 0;
    margin-top: 15px;
    border-top: 2px solid #e5e7eb;
    font-size: 16px;
  }

  .adjustment-total strong {
    color: #374151;
  }

  .adjustment-total span {
    color: #1e40af;
    font-weight: bold;
  }

  .adjustment-result {
    display: flex;
    justify-content: space-between;
    padding: 15px;
    background: #dbeafe;
    border-radius: 6px;
    font-size: 18px;
    margin-top: 10px;
  }

  .adjustment-result strong {
    color: #1e40af;
  }

  .adjustment-result span {
    color: #1e40af;
    font-weight: bold;
  }

  @media print {
    body {
      background: white;
      padding: 0;
    }

    .report-container {
      box-shadow: none;
      padding: 20px;
    }

    .section {
      page-break-inside: avoid;
    }

    .chart-container {
      page-break-inside: avoid;
    }
  }
</style>
    `;
  }

  /**
   * Generate report header.
   */
  private generateHeader(marketAnalysis: MarketAnalysis): string {
    const date = new Date(marketAnalysis.calculatedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<div class="report-container">
  <div class="header">
    <h1>Market Analysis Report</h1>
    <div class="meta">
      <p>Appraisal ID: ${marketAnalysis.appraisalId}</p>
      <p>Generated: ${date}</p>
      <p>Vehicle: ${marketAnalysis.lossVehicle.year} ${marketAnalysis.lossVehicle.make} ${marketAnalysis.lossVehicle.model}</p>
    </div>
  </div>
    `;
  }

  /**
   * Generate executive summary section.
   */
  private generateSummarySection(marketAnalysis: MarketAnalysis): string {
    const diffClass = marketAnalysis.isUndervalued ? 'warning' : 'success';
    const diffSign = marketAnalysis.valueDifference >= 0 ? '+' : '';

    return `
  <div class="section">
    <h2>Executive Summary</h2>
    <div class="summary-grid">
      <div class="summary-card highlight">
        <div class="label">Calculated Market Value</div>
        <div class="value">${this.formatCurrency(marketAnalysis.calculatedMarketValue)}</div>
      </div>
      <div class="summary-card">
        <div class="label">Insurance Valuation</div>
        <div class="value">${this.formatCurrency(marketAnalysis.insuranceValue)}</div>
      </div>
      <div class="summary-card ${diffClass}">
        <div class="label">Difference</div>
        <div class="value">${diffSign}${this.formatCurrency(marketAnalysis.valueDifference)} (${diffSign}${marketAnalysis.valueDifferencePercentage.toFixed(1)}%)</div>
      </div>
      <div class="summary-card">
        <div class="label">Confidence Level</div>
        <div class="value">${marketAnalysis.confidenceLevel.toFixed(0)}%</div>
      </div>
      <div class="summary-card">
        <div class="label">Comparables Analyzed</div>
        <div class="value">${marketAnalysis.comparablesCount}</div>
      </div>
      <div class="summary-card">
        <div class="label">Calculation Method</div>
        <div class="value" style="font-size: 14px;">Quality-Weighted Average</div>
      </div>
    </div>
    ${marketAnalysis.isUndervalued ? `
    <div class="summary-card warning" style="margin-top: 20px;">
      <div class="label">⚠️ Potential Undervaluation Detected</div>
      <p style="margin-top: 10px; color: #92400e;">
        The insurance valuation is ${Math.abs(marketAnalysis.valueDifferencePercentage).toFixed(1)}% 
        ${marketAnalysis.valueDifference > 0 ? 'lower' : 'higher'} than the calculated market value based on 
        ${marketAnalysis.comparablesCount} comparable vehicles.
      </p>
    </div>
    ` : ''}
  </div>
    `;
  }

  /**
   * Generate loss vehicle section.
   */
  private generateLossVehicleSection(marketAnalysis: MarketAnalysis): string {
    const vehicle = marketAnalysis.lossVehicle;

    return `
  <div class="section">
    <h2>Loss Vehicle Details</h2>
    <div class="vehicle-info">
      <dl>
        <dt>VIN:</dt>
        <dd>${vehicle.vin}</dd>
        <dt>Year:</dt>
        <dd>${vehicle.year}</dd>
        <dt>Make:</dt>
        <dd>${vehicle.make}</dd>
        <dt>Model:</dt>
        <dd>${vehicle.model}</dd>
        ${vehicle.trim ? `<dt>Trim:</dt><dd>${vehicle.trim}</dd>` : ''}
        <dt>Mileage:</dt>
        <dd>${vehicle.mileage.toLocaleString()} miles</dd>
        <dt>Location:</dt>
        <dd>${vehicle.location}</dd>
        ${vehicle.condition ? `<dt>Condition:</dt><dd>${vehicle.condition}</dd>` : ''}
        ${vehicle.equipment && vehicle.equipment.length > 0 ? `
        <dt>Equipment:</dt>
        <dd>${vehicle.equipment.join(', ')}</dd>
        ` : ''}
      </dl>
    </div>
  </div>
    `;
  }

  /**
   * Generate comparables section with visualizations.
   */
  private generateComparablesSection(marketAnalysis: MarketAnalysis): string {
    const rows = marketAnalysis.comparables.map(comp => {
      const qualityClass = comp.qualityScore >= 80 ? 'high' : comp.qualityScore >= 60 ? 'medium' : 'low';
      
      return `
        <tr>
          <td>${comp.year} ${comp.make} ${comp.model}</td>
          <td>${comp.mileage.toLocaleString()}</td>
          <td>${comp.location}</td>
          <td>${comp.distanceFromLoss} mi</td>
          <td>${this.formatCurrency(comp.listPrice)}</td>
          <td>${this.formatCurrency(comp.adjustedPrice || comp.listPrice)}</td>
          <td><span class="quality-score ${qualityClass}">${comp.qualityScore.toFixed(1)}</span></td>
          <td>${comp.source}</td>
        </tr>
      `;
    }).join('');

    // Generate visualizations
    const priceDistributionChart = this.generatePriceDistributionChart(marketAnalysis);
    const qualityScoreChart = this.generateQualityScoreChart(marketAnalysis);

    return `
  <div class="section">
    <h2>Comparable Vehicles</h2>
    
    <h3>Price Distribution</h3>
    ${priceDistributionChart}
    
    <h3>Quality Score Distribution</h3>
    ${qualityScoreChart}
    
    <h3>Detailed Comparables</h3>
    <table>
      <thead>
        <tr>
          <th>Vehicle</th>
          <th>Mileage</th>
          <th>Location</th>
          <th>Distance</th>
          <th>List Price</th>
          <th>Adjusted Price</th>
          <th>Quality Score</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
    `;
  }

  /**
   * Generate calculations section with adjustment details.
   */
  private generateCalculationsSection(marketAnalysis: MarketAnalysis): string {
    const steps = marketAnalysis.calculationBreakdown.steps.map(step => `
      <div class="calculation-step">
        <div class="step-number">Step ${step.step}: ${step.description}</div>
        <div class="formula">${step.calculation}</div>
        <div><strong>Result:</strong> ${this.formatCurrency(step.result)}</div>
      </div>
    `).join('');

    // Generate adjustment details for each comparable
    const adjustmentDetails = marketAnalysis.comparables.map(comp => 
      this.generateAdjustmentDetails(comp)
    ).join('');

    return `
  <div class="section">
    <h2>Detailed Calculations</h2>
    
    <h3>Individual Comparable Adjustments</h3>
    <p>Each comparable vehicle's price is adjusted for differences in mileage, equipment, and condition:</p>
    ${adjustmentDetails}
    
    <h3>Market Value Calculation</h3>
    <p>The market value is calculated using a quality-weighted average of all comparable vehicles:</p>
    ${steps}
    
    <h3>Confidence Level Analysis</h3>
    <div class="vehicle-info">
      <dl>
        <dt>Number of Comparables:</dt>
        <dd>${marketAnalysis.confidenceFactors.comparableCount}</dd>
        <dt>Quality Score Variance:</dt>
        <dd>${marketAnalysis.confidenceFactors.qualityScoreVariance.toFixed(2)}</dd>
        <dt>Price Variance:</dt>
        <dd>${marketAnalysis.confidenceFactors.priceVariance.toFixed(2)}</dd>
        <dt>Overall Confidence:</dt>
        <dd><strong>${marketAnalysis.confidenceLevel.toFixed(0)}%</strong></dd>
      </dl>
    </div>
  </div>
    `;
  }

  /**
   * Generate methodology section.
   */
  private generateMethodologySection(): string {
    return `
  <div class="section">
    <h2>Methodology</h2>
    
    <h3>Quality Score Calculation</h3>
    <p>Each comparable vehicle is assigned a quality score based on multiple factors:</p>
    <ul style="margin-left: 20px; margin-top: 10px;">
      <li><strong>Distance:</strong> Comparables within 100 miles receive no penalty. Beyond 100 miles, 0.1 points are deducted per mile.</li>
      <li><strong>Age:</strong> Exact year matches receive no penalty. Each year of difference results in a 2-point deduction.</li>
      <li><strong>Mileage:</strong> Comparables within 20% of the loss vehicle's mileage receive a 10-point bonus. Greater differences incur penalties.</li>
      <li><strong>Equipment:</strong> Matching equipment provides bonuses, while missing features result in penalties.</li>
    </ul>
    
    <h3>Price Adjustments</h3>
    <p>Comparable prices are adjusted for differences in mileage, equipment, and condition:</p>
    <ul style="margin-left: 20px; margin-top: 10px;">
      <li><strong>Mileage:</strong> Adjusted using age-based depreciation rates ($0.25/mile for 0-3 years, $0.15/mile for 4-7 years, $0.05/mile for 8+ years).</li>
      <li><strong>Equipment:</strong> Standard values applied for common features (e.g., Navigation: $1,200, Sunroof: $1,200).</li>
      <li><strong>Condition:</strong> Multipliers applied based on condition (Excellent: 1.05, Good: 1.00, Fair: 0.95, Poor: 0.85).</li>
    </ul>
    
    <h3>Market Value Formula</h3>
    <p>The final market value is calculated as a quality-weighted average:</p>
    <div class="formula" style="margin: 20px 0;">
      Market Value = Σ(Adjusted Price × Quality Score) / Σ(Quality Scores)
    </div>
    
    <h3>Confidence Level</h3>
    <p>Confidence is determined by the number of comparables, consistency of quality scores, and price variance. More comparables with consistent scores and prices result in higher confidence.</p>
  </div>
    `;
  }

  /**
   * Generate report footer.
   */
  private generateFooter(): string {
    return `
  <div class="footer">
    <p>This report was generated by Automotive Appraisal System</p>
    <p>Report generated on ${new Date().toLocaleString()}</p>
    <p>© ${new Date().getFullYear()} All rights reserved</p>
  </div>
</div>
    `;
  }

  /**
   * Format a number as currency.
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Generate price distribution chart (horizontal bar chart).
   */
  private generatePriceDistributionChart(marketAnalysis: MarketAnalysis): string {
    const comparables = marketAnalysis.comparables;
    const prices = comparables.map(c => c.adjustedPrice || c.listPrice);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const avgPrice = marketAnalysis.calculatedMarketValue;
    
    const bars = comparables.map((comp, index) => {
      const price = comp.adjustedPrice || comp.listPrice;
      const percentage = (price / maxPrice) * 100;
      const qualityClass = comp.qualityScore >= 80 ? 'high' : comp.qualityScore >= 60 ? 'medium' : 'low';
      
      return `
        <div class="chart-row">
          <div class="chart-label">${comp.year} ${comp.make} ${comp.model}</div>
          <div class="chart-bar-container">
            <div class="chart-bar ${qualityClass}" style="width: ${percentage}%">
              <span class="chart-value">${this.formatCurrency(price)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="chart-container">
        <div class="chart-stats">
          <div class="stat">
            <span class="stat-label">Average:</span>
            <span class="stat-value">${this.formatCurrency(avgPrice)}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Range:</span>
            <span class="stat-value">${this.formatCurrency(minPrice)} - ${this.formatCurrency(maxPrice)}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Spread:</span>
            <span class="stat-value">${this.formatCurrency(maxPrice - minPrice)}</span>
          </div>
        </div>
        <div class="chart">
          ${bars}
        </div>
      </div>
    `;
  }

  /**
   * Generate quality score distribution chart.
   */
  private generateQualityScoreChart(marketAnalysis: MarketAnalysis): string {
    const comparables = marketAnalysis.comparables;
    const scores = comparables.map(c => c.qualityScore);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    
    // Group scores into ranges
    const highCount = scores.filter(s => s >= 80).length;
    const mediumCount = scores.filter(s => s >= 60 && s < 80).length;
    const lowCount = scores.filter(s => s < 60).length;
    const total = scores.length;
    
    const highPercentage = (highCount / total) * 100;
    const mediumPercentage = (mediumCount / total) * 100;
    const lowPercentage = (lowCount / total) * 100;
    
    return `
      <div class="chart-container">
        <div class="chart-stats">
          <div class="stat">
            <span class="stat-label">Average Score:</span>
            <span class="stat-value">${avgScore.toFixed(1)}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Range:</span>
            <span class="stat-value">${minScore.toFixed(1)} - ${maxScore.toFixed(1)}</span>
          </div>
        </div>
        
        <div class="quality-distribution">
          <div class="distribution-bar">
            ${highCount > 0 ? `<div class="distribution-segment high" style="width: ${highPercentage}%">
              <span class="segment-label">High (80+): ${highCount}</span>
            </div>` : ''}
            ${mediumCount > 0 ? `<div class="distribution-segment medium" style="width: ${mediumPercentage}%">
              <span class="segment-label">Medium (60-79): ${mediumCount}</span>
            </div>` : ''}
            ${lowCount > 0 ? `<div class="distribution-segment low" style="width: ${lowPercentage}%">
              <span class="segment-label">Low (<60): ${lowCount}</span>
            </div>` : ''}
          </div>
        </div>
        
        <div class="chart">
          ${comparables.map(comp => {
            const percentage = (comp.qualityScore / 100) * 100;
            const qualityClass = comp.qualityScore >= 80 ? 'high' : comp.qualityScore >= 60 ? 'medium' : 'low';
            
            return `
              <div class="chart-row">
                <div class="chart-label">${comp.year} ${comp.make} ${comp.model}</div>
                <div class="chart-bar-container">
                  <div class="chart-bar ${qualityClass}" style="width: ${percentage}%">
                    <span class="chart-value">${comp.qualityScore.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Generate adjustment details for a comparable.
   */
  private generateAdjustmentDetails(comparable: ComparableVehicle): string {
    const adjustments = comparable.adjustments;
    
    return `
      <div class="adjustment-details">
        <h4>Price Adjustments for ${comparable.year} ${comparable.make} ${comparable.model}</h4>
        
        <div class="adjustment-item">
          <strong>Mileage Adjustment:</strong>
          <p>${adjustments.mileageAdjustment.explanation}</p>
          <p class="adjustment-value">${adjustments.mileageAdjustment.adjustmentAmount >= 0 ? '+' : ''}${this.formatCurrency(adjustments.mileageAdjustment.adjustmentAmount)}</p>
        </div>
        
        ${adjustments.equipmentAdjustments.length > 0 ? `
        <div class="adjustment-item">
          <strong>Equipment Adjustments:</strong>
          <ul>
            ${adjustments.equipmentAdjustments.map((adj: EquipmentAdjustment) => `
              <li>${adj.explanation}: ${adj.value >= 0 ? '+' : ''}${this.formatCurrency(adj.value)}</li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        <div class="adjustment-item">
          <strong>Condition Adjustment:</strong>
          <p>${adjustments.conditionAdjustment.explanation}</p>
          <p class="adjustment-value">${adjustments.conditionAdjustment.adjustmentAmount >= 0 ? '+' : ''}${this.formatCurrency(adjustments.conditionAdjustment.adjustmentAmount)}</p>
        </div>
        
        <div class="adjustment-total">
          <strong>Total Adjustment:</strong>
          <span>${adjustments.totalAdjustment >= 0 ? '+' : ''}${this.formatCurrency(adjustments.totalAdjustment)}</span>
        </div>
        
        <div class="adjustment-result">
          <strong>Adjusted Price:</strong>
          <span>${this.formatCurrency(adjustments.adjustedPrice)}</span>
        </div>
      </div>
    `;
  }
}
