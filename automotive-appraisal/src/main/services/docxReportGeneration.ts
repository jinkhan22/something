import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  VerticalAlign,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  ImageRun,
  convertInchesToTwip
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import type {
  ExtractedVehicleData,
  ComparableVehicle,
  MarketAnalysis,
  EquipmentAdjustment
} from '../../types';

/**
 * Report generation options for DOCX appraisal reports
 */
export interface AppraisalReportOptions {
  includeDetailedCalculations: boolean;
  includeQualityScoreBreakdown: boolean;
  appraiserName: string;
  appraiserCredentials?: string;
  companyName?: string;
  companyLogo?: string;
  customNotes?: string;
  selectedComparables?: string[]; // IDs of comparables to include
}

/**
 * Complete appraisal data for report generation
 */
export interface AppraisalReportData {
  lossVehicle: ExtractedVehicleData;
  insuranceInfo: {
    carrier: string;
    valuation: number;
    date: string;
  };
  comparables: ComparableVehicle[];
  marketAnalysis: MarketAnalysis;
  metadata: {
    reportDate: string;
    appraiser: string;
    credentials?: string;
    company?: string;
  };
}

/**
 * Document styles configuration for professional report formatting
 */
interface DocumentStyles {
  heading1: {
    font: string;
    size: number;
    bold: boolean;
    color: string;
  };
  heading2: {
    font: string;
    size: number;
    bold: boolean;
    color: string;
  };
  heading3: {
    font: string;
    size: number;
    bold: boolean;
    color: string;
  };
  bodyText: {
    font: string;
    size: number;
  };
  tableHeader: {
    font: string;
    size: number;
    bold: boolean;
    color: string;
  };
  tableLabel: {
    font: string;
    size: number;
    bold: boolean;
  };
  formula: {
    font: string;
    size: number;
  };
}

/**
 * ReportGenerationService
 * 
 * Generates professional DOCX appraisal reports similar to Mitchell and CCC One reports.
 * Reports include cover page, vehicle details, comparables analysis, adjustments,
 * market value calculation, and insurance comparison.
 * 
 * User-Specific Branding Support:
 * - Report branding settings are stored per user in the application settings
 * - Settings are persisted in the user's data directory (app.getPath('userData'))
 * - Each user profile (OS user account) has separate settings
 * - Default branding is used if not configured
 * - Logo files are referenced by absolute path, allowing user-specific logos
 */
export class DOCXReportGenerationService {
  /**
   * Document styles configuration
   */
  private readonly styles: DocumentStyles = {
    heading1: {
      font: 'Calibri',
      size: 32, // 16pt
      bold: true,
      color: '1E40AF'
    },
    heading2: {
      font: 'Calibri',
      size: 28, // 14pt
      bold: true,
      color: '2563EB'
    },
    heading3: {
      font: 'Calibri',
      size: 24, // 12pt
      bold: true,
      color: '3B82F6'
    },
    bodyText: {
      font: 'Calibri',
      size: 22 // 11pt
    },
    tableHeader: {
      font: 'Calibri',
      size: 20, // 10pt
      bold: true,
      color: '1F2937'
    },
    tableLabel: {
      font: 'Calibri',
      size: 20, // 10pt
      bold: true
    },
    formula: {
      font: 'Courier New',
      size: 20 // 10pt
    }
  };
  /**
   * Create a formatted table with headers and data rows
   * 
   * @param headers - Array of header labels
   * @param rows - Array of row data (each row is an array of cell values)
   * @param columnWidths - Array of column width percentages (must sum to 100)
   * @param alternatingRows - Whether to use alternating row colors
   * @returns Formatted Table object
   */
  private createFormattedTable(
    headers: string[],
    rows: string[][],
    columnWidths: number[],
    alternatingRows: boolean = true
  ): Table {
    // Create header row
    const headerRow = new TableRow({
      children: headers.map((header, index) => 
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: header,
                  font: this.styles.tableHeader.font,
                  size: this.styles.tableHeader.size,
                  bold: this.styles.tableHeader.bold,
                  color: this.styles.tableHeader.color
                })
              ]
            })
          ],
          width: { size: columnWidths[index], type: WidthType.PERCENTAGE },
          shading: { fill: 'E5E7EB', type: ShadingType.SOLID },
          margins: {
            top: 100,
            bottom: 100,
            left: 100,
            right: 100
          }
        })
      ),
      tableHeader: true
    });

    // Create data rows
    const dataRows = rows.map((row, rowIndex) => 
      new TableRow({
        children: row.map((cell, cellIndex) => 
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cell,
                    font: this.styles.bodyText.font,
                    size: this.styles.bodyText.size
                  })
                ]
              })
            ],
            width: { size: columnWidths[cellIndex], type: WidthType.PERCENTAGE },
            shading: alternatingRows && rowIndex % 2 === 1 
              ? { fill: 'F9FAFB', type: ShadingType.SOLID }
              : { fill: 'FFFFFF', type: ShadingType.SOLID },
            verticalAlign: VerticalAlign.CENTER,
            margins: {
              top: 80,
              bottom: 80,
              left: 100,
              right: 100
            }
          })
        )
      })
    );

    // Create table with borders
    return new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' }
      }
    });
  }

  /**
   * Get page layout configuration
   * Standard Letter size (8.5" × 11") with 1-inch margins
   * 
   * @returns Page properties configuration
   */
  private getPageLayout() {
    return {
      page: {
        margin: {
          top: 1440,    // 1 inch = 1440 twips (twentieths of a point)
          right: 1440,  // 1 inch
          bottom: 1440, // 1 inch
          left: 1440    // 1 inch
        },
        size: {
          width: 12240,  // 8.5 inches = 12240 twips
          height: 15840  // 11 inches = 15840 twips
        },
        orientation: 'portrait' as const
      }
    };
  }

  /**
   * Create a page break paragraph
   * 
   * @returns Paragraph with page break
   */
  private createPageBreak(): Paragraph {
    return new Paragraph({ 
      children: [new PageBreak()],
      spacing: { before: 0, after: 0 }
    });
  }

  /**
   * Create document header with report title and page number
   * 
   * @returns Header configuration
   */
  private createHeader(): Header {
    return new Header({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: 'Automotive Appraisal Report',
              font: this.styles.bodyText.font,
              size: 18, // 9pt
              bold: true
            }),
            new TextRun({
              text: '\t\tPage ',
              font: this.styles.bodyText.font,
              size: 18 // 9pt
            }),
            new TextRun({
              children: [PageNumber.CURRENT],
              font: this.styles.bodyText.font,
              size: 18 // 9pt
            })
          ],
          alignment: AlignmentType.LEFT,
          border: {
            bottom: {
              color: '2563EB',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6
            }
          }
        })
      ]
    });
  }

  /**
   * Create document footer with generation date and appraiser name
   * 
   * @param reportDate - Report generation date
   * @param appraiser - Appraiser name
   * @param credentials - Optional appraiser credentials
   * @returns Footer configuration
   */
  private createFooter(
    reportDate: string,
    appraiser: string,
    credentials?: string
  ): Footer {
    return new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated: ${reportDate}`,
              font: this.styles.bodyText.font,
              size: 18 // 9pt
            }),
            new TextRun({
              text: `\t\t${appraiser}${credentials ? ', ' + credentials : ''}`,
              font: this.styles.bodyText.font,
              size: 18 // 9pt
            })
          ],
          alignment: AlignmentType.LEFT,
          border: {
            top: {
              color: 'CCCCCC',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6
            }
          }
        })
      ]
    });
  }

  /**
   * Create a two-column key-value table (commonly used for vehicle details)
   * 
   * @param data - Array of [label, value] pairs
   * @param labelWidth - Width percentage for label column (default 30)
   * @returns Formatted Table object
   */
  private createKeyValueTable(
    data: [string, string][],
    labelWidth: number = 30
  ): Table {
    const rows = data.map(([label, value]) => 
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: label,
                    font: this.styles.tableLabel.font,
                    size: this.styles.tableLabel.size,
                    bold: this.styles.tableLabel.bold
                  })
                ]
              })
            ],
            width: { size: labelWidth, type: WidthType.PERCENTAGE },
            shading: { fill: 'F3F4F6', type: ShadingType.SOLID },
            margins: {
              top: 80,
              bottom: 80,
              left: 100,
              right: 100
            }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: value,
                    font: this.styles.bodyText.font,
                    size: this.styles.bodyText.size
                  })
                ]
              })
            ],
            width: { size: 100 - labelWidth, type: WidthType.PERCENTAGE },
            margins: {
              top: 80,
              bottom: 80,
              left: 100,
              right: 100
            }
          })
        ]
      })
    );

    return new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' }
      }
    });
  }

  /**
   * Generate a complete appraisal report in DOCX format
   * 
   * @param appraisal - Complete appraisal data
   * @param options - Report customization options
   * @param filePath - Output file path
   * @returns Path to generated report file
   */
  async generateAppraisalReport(
    appraisal: AppraisalReportData,
    options: AppraisalReportOptions,
    filePath: string
  ): Promise<string> {
    console.log('=== DOCXReportGenerationService.generateAppraisalReport START ===');
    console.log('Appraisal ID:', appraisal.marketAnalysis.appraisalId);
    console.log('Output path:', filePath);
    console.log('Options:', options);

    try {
      // Validate inputs
      if (!appraisal || !appraisal.lossVehicle) {
        throw new Error('Missing required appraisal data');
      }
      
      if (!appraisal.marketAnalysis) {
        throw new Error('Missing market analysis data');
      }
      
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path provided');
      }

      // Filter comparables if specific ones are selected
      const comparablesToInclude = options.selectedComparables
        ? appraisal.comparables.filter(c => options.selectedComparables!.includes(c.id))
        : appraisal.comparables;

      if (comparablesToInclude.length === 0) {
        throw new Error('No comparable vehicles to include in report');
      }

      console.log(`Including ${comparablesToInclude.length} of ${appraisal.comparables.length} comparables`);

      // Create document sections
      const sections = [];

      // Build all sections
      const coverPageParagraphs = this.buildCoverPage(appraisal, options);
      const executiveSummaryParagraphs = this.buildExecutiveSummary(appraisal);
      const vehicleInfoParagraphs = this.buildVehicleInfoSection(appraisal.lossVehicle);
      const insuranceValuationParagraphs = this.buildInsuranceValuationSection(appraisal.insuranceInfo);
      const methodologyParagraphs = this.buildMethodologySection();
      const comparablesParagraphs = this.buildComparablesSection(comparablesToInclude);
      
      let adjustmentsParagraphs: (Paragraph | Table)[] = [];
      if (options.includeDetailedCalculations) {
        adjustmentsParagraphs = this.buildAdjustmentsSection(comparablesToInclude);
      }
      
      const marketValueParagraphs = this.buildMarketValueSection(appraisal.marketAnalysis);
      const comparisonParagraphs = this.buildComparisonSection(
        appraisal.marketAnalysis.calculatedMarketValue,
        appraisal.insuranceInfo.valuation
      );
      const conclusionParagraphs = this.buildConclusionSection(appraisal, options);

      // Combine all sections with page breaks
      const allContent = [
        ...coverPageParagraphs,
        this.createPageBreak(),
        ...executiveSummaryParagraphs,
        this.createPageBreak(),
        ...vehicleInfoParagraphs,
        ...insuranceValuationParagraphs,
        this.createPageBreak(),
        ...methodologyParagraphs,
        this.createPageBreak(),
        ...comparablesParagraphs,
        this.createPageBreak(),
        ...adjustmentsParagraphs,
        ...(adjustmentsParagraphs.length > 0 ? [this.createPageBreak()] : []),
        ...marketValueParagraphs,
        this.createPageBreak(),
        ...comparisonParagraphs,
        ...conclusionParagraphs
      ];

      // Create document with headers and footers
      const doc = new Document({
        sections: [{
          properties: this.getPageLayout(),
          headers: {
            default: this.createHeader()
          },
          footers: {
            default: this.createFooter(
              appraisal.metadata.reportDate,
              appraisal.metadata.appraiser,
              appraisal.metadata.credentials
            )
          },
          children: allContent
        }]
      });

      // Generate and save document
      console.log('Generating DOCX buffer...');
      let buffer: Buffer;
      try {
        buffer = await Packer.toBuffer(doc);
      } catch (error) {
        console.error('Failed to generate DOCX buffer:', error);
        throw new Error('Failed to create document. Please check your data and try again.');
      }
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      } catch (error) {
        console.error('Failed to create directory:', error);
        if (error instanceof Error && error.message.includes('EACCES')) {
          throw new Error('Permission denied. Please choose a different location or check folder permissions.');
        } else if (error instanceof Error && error.message.includes('ENOSPC')) {
          throw new Error('Not enough disk space. Please free up space and try again.');
        }
        throw new Error('Failed to create output directory. Please try a different location.');
      }
      
      // Write file to disk
      console.log('Writing file to disk...');
      try {
        fs.writeFileSync(filePath, buffer);
      } catch (error) {
        console.error('Failed to write file:', error);
        if (error instanceof Error && error.message.includes('EACCES')) {
          throw new Error('Permission denied. Please choose a different location or check file permissions.');
        } else if (error instanceof Error && error.message.includes('ENOSPC')) {
          throw new Error('Not enough disk space. Please free up space and try again.');
        } else if (error instanceof Error && error.message.includes('EEXIST')) {
          throw new Error('File already exists and cannot be overwritten. Please choose a different name.');
        }
        throw new Error('Failed to save report file. Please try again or choose a different location.');
      }
      
      // Verify file was written successfully
      try {
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
          throw new Error('Report file was created but is empty. Please try again.');
        }
      } catch (error) {
        if (error instanceof Error && !error.message.includes('empty')) {
          throw new Error('Failed to verify report file. The file may not have been saved correctly.');
        }
        throw error;
      }
      
      console.log('=== DOCXReportGenerationService.generateAppraisalReport COMPLETE ===');
      console.log('Report saved to:', filePath);
      console.log('File size:', fs.statSync(filePath).size, 'bytes');
      
      return filePath;
    } catch (error) {
      console.error('Error generating report:', error);
      
      // Re-throw with user-friendly message if not already user-friendly
      if (error instanceof Error) {
        // If error message already starts with known user-friendly patterns, re-throw as-is
        if (error.message.includes('Permission denied') ||
            error.message.includes('Not enough disk space') ||
            error.message.includes('Missing required') ||
            error.message.includes('Invalid file path') ||
            error.message.includes('No comparable vehicles')) {
          throw error;
        }
      }
      
      // Otherwise, wrap in generic error
      throw new Error(`Failed to generate appraisal report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build cover page section
   */
  buildCoverPage(
    appraisal: AppraisalReportData,
    options: AppraisalReportOptions
  ): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // Company logo (if provided)
    if (options.companyLogo && fs.existsSync(options.companyLogo)) {
      try {
        const logoBuffer = fs.readFileSync(options.companyLogo);
        const ext = options.companyLogo.toLowerCase().split('.').pop();
        
        // Validate file type
        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
          paragraphs.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: logoBuffer,
                  transformation: {
                    width: 200,  // 2 inches
                    height: 100  // 1 inch (will maintain aspect ratio)
                  }
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 1440, after: 720 } // 1 inch before, 0.5 inch after
            })
          );
        }
      } catch (error) {
        console.error('Failed to load company logo:', error);
        // Continue without logo if it fails to load
      }
    }

    // Report title
    paragraphs.push(
      new Paragraph({
        text: 'AUTOMOTIVE APPRAISAL REPORT',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: options.companyLogo ? 720 : 2880, after: 1440 } // Less space if logo present
      })
    );

    // Generation date
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: appraisal.metadata.reportDate,
            size: 24
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 720 }
      })
    );

    // Appraiser information
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Prepared by:',
            size: 22,
            bold: true
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1440, after: 240 }
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: appraisal.metadata.appraiser,
            size: 24
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 }
      })
    );

    if (appraisal.metadata.credentials) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: appraisal.metadata.credentials,
              size: 20,
              italics: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 }
        })
      );
    }

    if (appraisal.metadata.company) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: appraisal.metadata.company,
              size: 22,
              bold: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 1440 }
        })
      );
    }

    // Loss vehicle summary
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Subject Vehicle:',
            size: 22,
            bold: true
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1440, after: 240 }
      })
    );

    const vehicle = appraisal.lossVehicle;
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            size: 28,
            bold: true
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 }
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `VIN: ${vehicle.vin}`,
            size: 20
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 }
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Mileage: ${vehicle.mileage.toLocaleString()} miles`,
            size: 20
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 }
      })
    );

    return paragraphs;
  }

  /**
   * Build executive summary section
   */
  buildExecutiveSummary(appraisal: AppraisalReportData): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const analysis = appraisal.marketAnalysis;

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Executive Summary',
            font: this.styles.heading1.font,
            size: this.styles.heading1.size,
            bold: this.styles.heading1.bold,
            color: this.styles.heading1.color
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 240 }
      })
    );

    // Key findings paragraph
    const diffPercentage = Math.abs(analysis.valueDifferencePercentage);
    const isUndervalued = analysis.valueDifference < 0;
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'This appraisal report presents a comprehensive market analysis of the subject vehicle based on ',
            size: 22
          }),
          new TextRun({
            text: `${analysis.comparablesCount} comparable vehicles`,
            size: 22,
            bold: true
          }),
          new TextRun({
            text: '. The analysis utilizes industry-standard adjustment methodologies for mileage, equipment, and condition differences.',
            size: 22
          })
        ],
        spacing: { after: 240 }
      })
    );

    // Market value
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Calculated Market Value: ',
            size: 24,
            bold: true
          }),
          new TextRun({
            text: this.formatCurrency(analysis.calculatedMarketValue),
            size: 28,
            bold: true,
            color: '1E40AF'
          })
        ],
        spacing: { before: 240, after: 120 }
      })
    );

    // Insurance comparison
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Insurance Valuation: ',
            size: 22
          }),
          new TextRun({
            text: this.formatCurrency(appraisal.insuranceInfo.valuation),
            size: 22,
            bold: true
          })
        ],
        spacing: { after: 120 }
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Difference: ',
            size: 22
          }),
          new TextRun({
            text: `${this.formatCurrency(Math.abs(analysis.valueDifference))} (${diffPercentage.toFixed(1)}%)`,
            size: 22,
            bold: true,
            color: isUndervalued ? 'DC2626' : '059669'
          })
        ],
        spacing: { after: 240 }
      })
    );

    // Confidence level
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `This analysis has a confidence level of `,
            size: 22
          }),
          new TextRun({
            text: `${analysis.confidenceLevel}%`,
            size: 22,
            bold: true
          }),
          new TextRun({
            text: ` based on the quality and consistency of the comparable vehicles analyzed.`,
            size: 22
          })
        ],
        spacing: { after: 240 }
      })
    );

    return paragraphs;
  }

  /**
   * Build loss vehicle information section
   */
  buildVehicleInfoSection(vehicle: ExtractedVehicleData): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Loss Vehicle Information',
            font: this.styles.heading1.font,
            size: this.styles.heading1.size,
            bold: this.styles.heading1.bold,
            color: this.styles.heading1.color
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 240 }
      })
    );

    // Build vehicle details data
    const vehicleData: [string, string][] = [
      ['Year', vehicle.year.toString()],
      ['Make', vehicle.make],
      ['Model', vehicle.model]
    ];

    if (vehicle.trim) {
      vehicleData.push(['Trim', vehicle.trim]);
    }

    vehicleData.push(
      ['VIN', vehicle.vin],
      ['Mileage', `${vehicle.mileage.toLocaleString()} miles`],
      ['Location', vehicle.location]
    );

    if (vehicle.condition) {
      vehicleData.push(['Condition', vehicle.condition]);
    }

    // Create table using helper method
    const table = this.createKeyValueTable(vehicleData, 30);

    paragraphs.push(new Paragraph({ children: [] })); // Spacer
    paragraphs.push(table as any);

    // Equipment list
    if (vehicle.equipment && vehicle.equipment.length > 0) {
      paragraphs.push(
        new Paragraph({
          text: 'Equipment:',
          spacing: { before: 240, after: 120 },
          style: 'strong'
        })
      );

      vehicle.equipment.forEach(item => {
        paragraphs.push(
          new Paragraph({
            text: `• ${item}`,
            spacing: { after: 60 },
            indent: { left: 360 }
          })
        );
      });
    }

    return paragraphs;
  }

  /**
   * Build insurance valuation section
   */
  buildInsuranceValuationSection(insuranceInfo: { carrier: string; valuation: number; date: string }): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Insurance Valuation',
            font: this.styles.heading1.font,
            size: this.styles.heading1.size,
            bold: this.styles.heading1.bold,
            color: this.styles.heading1.color
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 480, after: 240 }
      })
    );

    // Build insurance data
    const insuranceData: [string, string][] = [
      ['Insurance Carrier', insuranceInfo.carrier],
      ['Offered Amount', this.formatCurrency(insuranceInfo.valuation)],
      ['Valuation Date', insuranceInfo.date]
    ];

    // Create table using helper method
    const table = this.createKeyValueTable(insuranceData, 30);

    paragraphs.push(new Paragraph({ children: [] }));
    paragraphs.push(table as any);

    return paragraphs;
  }

  /**
   * Build methodology section
   */
  buildMethodologySection(): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Market Analysis Methodology',
            font: this.styles.heading1.font,
            size: this.styles.heading1.size,
            bold: this.styles.heading1.bold,
            color: this.styles.heading1.color
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 240 }
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'This appraisal utilizes a ',
            size: 22
          }),
          new TextRun({
            text: 'quality-weighted average methodology',
            size: 22,
            bold: true
          }),
          new TextRun({
            text: ' to determine fair market value. This approach is consistent with industry standards used by major valuation services including Mitchell International and CCC Information Services.',
            size: 22
          })
        ],
        spacing: { after: 240 }
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Adjustment Factors',
            font: this.styles.heading2.font,
            size: this.styles.heading2.size,
            bold: this.styles.heading2.bold,
            color: this.styles.heading2.color
          })
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 }
      })
    );

    paragraphs.push(
      new Paragraph({
        text: 'Mileage Adjustments:',
        style: 'strong',
        spacing: { before: 120, after: 60 }
      })
    );

    paragraphs.push(
      new Paragraph({
        text: '• Vehicles 0-3 years old: $0.25 per mile difference',
        spacing: { after: 60 },
        indent: { left: 360 }
      })
    );

    paragraphs.push(
      new Paragraph({
        text: '• Vehicles 4-7 years old: $0.15 per mile difference',
        spacing: { after: 60 },
        indent: { left: 360 }
      })
    );

    paragraphs.push(
      new Paragraph({
        text: '• Vehicles 8+ years old: $0.05 per mile difference',
        spacing: { after: 240 },
        indent: { left: 360 }
      })
    );

    paragraphs.push(
      new Paragraph({
        text: 'Equipment Adjustments:',
        style: 'strong',
        spacing: { before: 120, after: 60 }
      })
    );

    paragraphs.push(
      new Paragraph({
        text: 'Standard equipment values are applied based on market research: Navigation ($1,200), Sunroof ($1,200), Premium Audio ($800), Sport Package ($1,500), Leather Seats ($1,000).',
        spacing: { after: 240 },
        indent: { left: 360 }
      })
    );

    paragraphs.push(
      new Paragraph({
        text: 'Condition Adjustments:',
        style: 'strong',
        spacing: { before: 120, after: 60 }
      })
    );

    paragraphs.push(
      new Paragraph({
        text: 'Condition multipliers normalize comparable prices: Excellent (1.05), Good (1.00 baseline), Fair (0.95), Poor (0.85).',
        spacing: { after: 240 },
        indent: { left: 360 }
      })
    );

    return paragraphs;
  }

  /**
   * Build comparables section
   */
  buildComparablesSection(comparables: ComparableVehicle[]): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [];

    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Comparable Vehicles',
            font: this.styles.heading1.font,
            size: this.styles.heading1.size,
            bold: this.styles.heading1.bold,
            color: this.styles.heading1.color
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 240 }
      })
    );

    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `The following ${comparables.length} comparable vehicles were analyzed to determine market value:`,
            font: this.styles.bodyText.font,
            size: this.styles.bodyText.size
          })
        ],
        spacing: { after: 240 }
      })
    );

    // Prepare table data
    const headers = ['#', 'Source', 'Vehicle', 'Mileage', 'Location', 'Price', 'Quality'];
    const columnWidths = [5, 12, 25, 12, 18, 13, 15];
    
    const rows = comparables.map((comp, index) => [
      (index + 1).toString(),
      comp.source,
      `${comp.year} ${comp.make} ${comp.model}`,
      comp.mileage.toLocaleString(),
      comp.location,
      this.formatCurrency(comp.listPrice),
      comp.qualityScore.toFixed(1)
    ]);

    // Create table using helper method
    const table = this.createFormattedTable(headers, rows, columnWidths, true);

    elements.push(table as any);

    return elements;
  }

  /**
   * Format currency value
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
   * Build adjustments section showing detailed calculations for each comparable
   */
  buildAdjustmentsSection(comparables: ComparableVehicle[]): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [];

    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Adjustment Calculations',
            font: this.styles.heading1.font,
            size: this.styles.heading1.size,
            bold: this.styles.heading1.bold,
            color: this.styles.heading1.color
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 240 }
      })
    );

    elements.push(
      new Paragraph({
        text: 'Each comparable vehicle\'s price is adjusted to account for differences in mileage, equipment, and condition relative to the loss vehicle:',
        spacing: { after: 360 }
      })
    );

    // Create detailed adjustment breakdown for each comparable
    comparables.forEach((comp, index) => {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Comparable ${index + 1}: ${comp.year} ${comp.make} ${comp.model}`,
              font: this.styles.heading2.font,
              size: this.styles.heading2.size,
              bold: this.styles.heading2.bold,
              color: this.styles.heading2.color
            })
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 360, after: 180 }
        })
      );

      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'List Price: ',
              bold: true
            }),
            new TextRun({
              text: this.formatCurrency(comp.listPrice)
            })
          ],
          spacing: { after: 120 }
        })
      );

      // Mileage adjustment
      const mileageAdj = comp.adjustments.mileageAdjustment;
      elements.push(
        new Paragraph({
          text: 'Mileage Adjustment:',
          style: 'strong',
          spacing: { before: 180, after: 60 }
        })
      );

      elements.push(
        new Paragraph({
          text: mileageAdj.explanation,
          spacing: { after: 60 },
          indent: { left: 360 }
        })
      );

      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Formula: ',
              font: 'Courier New'
            }),
            new TextRun({
              text: `${Math.abs(mileageAdj.mileageDifference).toLocaleString()} miles × $${mileageAdj.depreciationRate.toFixed(2)}/mile = ${mileageAdj.adjustmentAmount >= 0 ? '+' : ''}${this.formatCurrency(mileageAdj.adjustmentAmount)}`,
              font: 'Courier New'
            })
          ],
          spacing: { after: 180 },
          indent: { left: 360 },
          shading: { fill: 'F9FAFB', type: ShadingType.SOLID }
        })
      );

      // Equipment adjustments
      if (comp.adjustments.equipmentAdjustments.length > 0) {
        elements.push(
          new Paragraph({
            text: 'Equipment Adjustments:',
            style: 'strong',
            spacing: { before: 180, after: 60 }
          })
        );

        comp.adjustments.equipmentAdjustments.forEach((eqAdj: EquipmentAdjustment) => {
          elements.push(
            new Paragraph({
              text: `• ${eqAdj.explanation}: ${eqAdj.value >= 0 ? '+' : ''}${this.formatCurrency(eqAdj.value)}`,
              spacing: { after: 60 },
              indent: { left: 360 }
            })
          );
        });

        const totalEquipment = comp.adjustments.equipmentAdjustments.reduce((sum, adj) => sum + adj.value, 0);
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Total Equipment Adjustment: ',
                bold: true
              }),
              new TextRun({
                text: `${totalEquipment >= 0 ? '+' : ''}${this.formatCurrency(totalEquipment)}`,
                bold: true
              })
            ],
            spacing: { before: 60, after: 180 },
            indent: { left: 360 }
          })
        );
      } else {
        elements.push(
          new Paragraph({
            text: 'Equipment Adjustments: None (equipment matches)',
            spacing: { before: 180, after: 180 },
            indent: { left: 360 }
          })
        );
      }

      // Condition adjustment
      const condAdj = comp.adjustments.conditionAdjustment;
      elements.push(
        new Paragraph({
          text: 'Condition Adjustment:',
          style: 'strong',
          spacing: { before: 180, after: 60 }
        })
      );

      elements.push(
        new Paragraph({
          text: condAdj.explanation,
          spacing: { after: 60 },
          indent: { left: 360 }
        })
      );

      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Multiplier: ',
              font: 'Courier New'
            }),
            new TextRun({
              text: `${condAdj.multiplier.toFixed(2)} → ${condAdj.adjustmentAmount >= 0 ? '+' : ''}${this.formatCurrency(condAdj.adjustmentAmount)}`,
              font: 'Courier New'
            })
          ],
          spacing: { after: 240 },
          indent: { left: 360 },
          shading: { fill: 'F9FAFB', type: ShadingType.SOLID }
        })
      );

      // Total adjustment and adjusted price
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Total Adjustment: ',
              bold: true,
              size: 24
            }),
            new TextRun({
              text: `${comp.adjustments.totalAdjustment >= 0 ? '+' : ''}${this.formatCurrency(comp.adjustments.totalAdjustment)}`,
              bold: true,
              size: 24,
              color: comp.adjustments.totalAdjustment >= 0 ? '059669' : 'DC2626'
            })
          ],
          spacing: { before: 120, after: 120 }
        })
      );

      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Adjusted Price: ',
              bold: true,
              size: 26
            }),
            new TextRun({
              text: this.formatCurrency(comp.adjustments.adjustedPrice),
              bold: true,
              size: 26,
              color: '1E40AF'
            })
          ],
          spacing: { after: 480 },
          shading: { fill: 'DBEAFE', type: ShadingType.SOLID }
        })
      );
    });

    return elements;
  }

  /**
   * Build market value determination section
   */
  buildMarketValueSection(marketAnalysis: MarketAnalysis): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Market Value Determination',
            font: this.styles.heading1.font,
            size: this.styles.heading1.size,
            bold: this.styles.heading1.bold,
            color: this.styles.heading1.color
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 240 }
      })
    );

    paragraphs.push(
      new Paragraph({
        text: 'The market value is calculated using a quality-weighted average formula:',
        spacing: { after: 180 }
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Market Value = Σ(Adjusted Price × Quality Score) / Σ(Quality Scores)',
            font: this.styles.formula.font,
            size: this.styles.formula.size,
            bold: true
          })
        ],
        spacing: { after: 360 },
        shading: { fill: 'F9FAFB', type: ShadingType.SOLID },
        alignment: AlignmentType.CENTER
      })
    );

    // Step-by-step calculation
    const calc = marketAnalysis.calculationBreakdown;

    calc.steps.forEach(step => {
      paragraphs.push(
        new Paragraph({
          text: `Step ${step.step}: ${step.description}`,
          style: 'strong',
          spacing: { before: 240, after: 120 }
        })
      );

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: step.calculation,
              font: this.styles.formula.font,
              size: this.styles.formula.size
            })
          ],
          spacing: { after: 120 },
          indent: { left: 360 },
          shading: { fill: 'F9FAFB', type: ShadingType.SOLID }
        })
      );

      if (step.result > 0) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Result: ',
                bold: true
              }),
              new TextRun({
                text: this.formatCurrency(step.result),
                bold: true,
                color: '1E40AF'
              })
            ],
            spacing: { after: 180 },
            indent: { left: 360 }
          })
        );
      }
    });

    // Final market value
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'CALCULATED MARKET VALUE: ',
            bold: true,
            size: 28
          }),
          new TextRun({
            text: this.formatCurrency(marketAnalysis.calculatedMarketValue),
            bold: true,
            size: 32,
            color: '1E40AF'
          })
        ],
        spacing: { before: 480, after: 240 },
        alignment: AlignmentType.CENTER,
        shading: { fill: 'DBEAFE', type: ShadingType.SOLID }
      })
    );

    // Confidence level
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Confidence Level: ',
            size: 24
          }),
          new TextRun({
            text: `${marketAnalysis.confidenceLevel}%`,
            size: 24,
            bold: true
          })
        ],
        spacing: { before: 240, after: 120 },
        alignment: AlignmentType.CENTER
      })
    );

    paragraphs.push(
      new Paragraph({
        text: `Based on ${marketAnalysis.comparablesCount} comparable vehicles with consistent quality scores and pricing.`,
        spacing: { after: 240 },
        alignment: AlignmentType.CENTER
      })
    );

    return paragraphs;
  }

  /**
   * Build insurance comparison section
   */
  buildComparisonSection(marketValue: number, insuranceValue: number): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Insurance Comparison',
            font: this.styles.heading1.font,
            size: this.styles.heading1.size,
            bold: this.styles.heading1.bold,
            color: this.styles.heading1.color
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 240 }
      })
    );

    const difference = marketValue - insuranceValue;
    const percentageDiff = (difference / insuranceValue) * 100;
    const isUndervalued = difference > 0;

    // Build comparison data
    const comparisonData: [string, string][] = [
      ['Insurance Valuation', this.formatCurrency(insuranceValue)],
      ['Calculated Market Value', this.formatCurrency(marketValue)],
      ['Difference ($)', `${difference >= 0 ? '+' : ''}${this.formatCurrency(Math.abs(difference))}`],
      ['Difference (%)', `${percentageDiff >= 0 ? '+' : ''}${percentageDiff.toFixed(1)}%`]
    ];

    // Create table using helper method
    const table = this.createKeyValueTable(comparisonData, 40);

    paragraphs.push(table as any);

    // Analysis paragraph
    if (Math.abs(percentageDiff) > 20) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '⚠️ SIGNIFICANT VALUATION DIFFERENCE DETECTED',
              bold: true,
              size: 24,
              color: 'DC2626'
            })
          ],
          spacing: { before: 360, after: 180 },
          shading: { fill: 'FEE2E2', type: ShadingType.SOLID }
        })
      );
    }

    paragraphs.push(
      new Paragraph({
        text: 'Analysis:',
        style: 'strong',
        spacing: { before: 240, after: 120 }
      })
    );

    if (isUndervalued) {
      paragraphs.push(
        new Paragraph({
          text: `The insurance valuation is ${this.formatCurrency(Math.abs(difference))} (${Math.abs(percentageDiff).toFixed(1)}%) lower than the calculated market value. This analysis is based on ${marketValue > insuranceValue ? 'current' : 'recent'} market data from comparable vehicles in similar condition and location.`,
          spacing: { after: 180 },
          indent: { left: 360 }
        })
      );

      if (Math.abs(percentageDiff) > 10) {
        paragraphs.push(
          new Paragraph({
            text: 'The significant difference suggests the insurance valuation may not fully reflect current market conditions. This report provides documented evidence of comparable vehicle pricing to support a fair settlement.',
            spacing: { after: 240 },
            indent: { left: 360 }
          })
        );
      }
    } else {
      paragraphs.push(
        new Paragraph({
          text: `The insurance valuation is ${this.formatCurrency(Math.abs(difference))} (${Math.abs(percentageDiff).toFixed(1)}%) higher than the calculated market value. The insurance offer appears to be fair based on current market conditions.`,
          spacing: { after: 240 },
          indent: { left: 360 }
        })
      );
    }

    return paragraphs;
  }

  /**
   * Build conclusion section
   */
  buildConclusionSection(appraisal: AppraisalReportData, options: AppraisalReportOptions): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Conclusion',
            font: this.styles.heading1.font,
            size: this.styles.heading1.size,
            bold: this.styles.heading1.bold,
            color: this.styles.heading1.color
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 240 }
      })
    );

    const analysis = appraisal.marketAnalysis;
    const isUndervalued = analysis.valueDifference > 0;

    // Summary of findings
    paragraphs.push(
      new Paragraph({
        text: `Based on a comprehensive analysis of ${analysis.comparablesCount} comparable vehicles, the fair market value of the subject vehicle (${appraisal.lossVehicle.year} ${appraisal.lossVehicle.make} ${appraisal.lossVehicle.model}, VIN: ${appraisal.lossVehicle.vin}) has been determined to be:`,
        spacing: { after: 240 }
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: this.formatCurrency(analysis.calculatedMarketValue),
            bold: true,
            size: 36,
            color: '1E40AF'
          })
        ],
        spacing: { after: 360 },
        alignment: AlignmentType.CENTER,
        shading: { fill: 'DBEAFE', type: ShadingType.SOLID }
      })
    );

    paragraphs.push(
      new Paragraph({
        text: 'This valuation is based on industry-standard methodologies and current market data. All comparable vehicles were carefully selected and adjusted for differences in mileage, equipment, and condition.',
        spacing: { after: 240 }
      })
    );

    // Recommendations if undervalued
    if (isUndervalued && Math.abs(analysis.valueDifferencePercentage) > 5) {
      paragraphs.push(
        new Paragraph({
          text: 'Recommendations:',
          style: 'strong',
          spacing: { before: 240, after: 120 }
        })
      );

      paragraphs.push(
        new Paragraph({
          text: `• The insurance valuation of ${this.formatCurrency(appraisal.insuranceInfo.valuation)} is ${Math.abs(analysis.valueDifferencePercentage).toFixed(1)}% below the calculated market value.`,
          spacing: { after: 120 },
          indent: { left: 360 }
        })
      );

      paragraphs.push(
        new Paragraph({
          text: '• This report provides documented evidence to support a request for adjustment to the insurance settlement.',
          spacing: { after: 120 },
          indent: { left: 360 }
        })
      );

      paragraphs.push(
        new Paragraph({
          text: '• All comparable vehicles and adjustments are documented and can be independently verified.',
          spacing: { after: 360 },
          indent: { left: 360 }
        })
      );
    }

    // Custom notes if provided
    if (options.customNotes) {
      paragraphs.push(
        new Paragraph({
          text: 'Additional Notes:',
          style: 'strong',
          spacing: { before: 360, after: 120 }
        })
      );

      paragraphs.push(
        new Paragraph({
          text: options.customNotes,
          spacing: { after: 360 },
          indent: { left: 360 }
        })
      );
    }

    // Signature section
    paragraphs.push(
      new Paragraph({
        text: 'Appraiser Certification:',
        style: 'strong',
        spacing: { before: 720, after: 240 }
      })
    );

    paragraphs.push(
      new Paragraph({
        text: 'I certify that this appraisal has been prepared in accordance with industry standards and represents my professional opinion of the fair market value of the subject vehicle based on the data and methodology described herein.',
        spacing: { after: 480 }
      })
    );

    paragraphs.push(
      new Paragraph({
        text: '_'.repeat(50),
        spacing: { before: 360, after: 120 }
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: appraisal.metadata.appraiser,
            bold: true
          }),
          new TextRun({
            text: appraisal.metadata.credentials ? `, ${appraisal.metadata.credentials}` : ''
          })
        ],
        spacing: { after: 120 }
      })
    );

    paragraphs.push(
      new Paragraph({
        text: '_'.repeat(50),
        spacing: { before: 240, after: 120 }
      })
    );

    paragraphs.push(
      new Paragraph({
        text: `Date: ${appraisal.metadata.reportDate}`,
        spacing: { after: 240 }
      })
    );

    return paragraphs;
  }
}
