import { parseExcelFile, validateExcelFile } from '../utils/excelParser.js';
import { normalizePhoneNumber } from '../utils/phoneUtils.js';

/**
 * Handle Excel file upload and parsing
 */
export const uploadExcelFile = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please select an Excel file.'
      });
    }

    console.log(`📁 Processing uploaded file: ${req.file.originalname}`);

    // Validate file format
    const validation = validateExcelFile(req.file);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Parse Excel file
    const parseResult = parseExcelFile(req.file.buffer);
    
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error
      });
    }

    // Validate and normalize phone numbers for each message row
    const processedMessageRows = [];
    const phoneErrors = [];
    let totalMessages = 0;

    for (const messageRow of parseResult.data) {
      const processedRow = { ...messageRow, validPhones: [] };

      // Process each phone in the row
      for (const phoneData of messageRow.phones) {
        const phoneResult = normalizePhoneNumber(phoneData.phone);
        if (phoneResult.success) {
          processedRow.validPhones.push({
            phone: phoneResult.phone,
            column: phoneData.column,
            original: phoneData.phone
          });
          totalMessages++;
        } else {
          phoneErrors.push(`Row ${messageRow.rowNumber} (Column ${phoneData.column}): ${phoneResult.error}`);
        }
      }

      // Only include rows with at least one valid phone number
      if (processedRow.validPhones.length > 0) {
        processedMessageRows.push(processedRow);
      } else {
        phoneErrors.push(`Row ${messageRow.rowNumber}: No valid phone numbers found`);
      }
    }

    if (processedMessageRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No message rows with valid phone numbers found',
        details: phoneErrors
      });
    }

    // Prepare response
    const response = {
      success: true,
      data: processedMessageRows,
      summary: {
        totalRows: parseResult.summary.totalRows,
        validRows: processedMessageRows.length,
        totalMessages: totalMessages,
        invalidRows: parseResult.data.length - processedMessageRows.length,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        uploadedAt: new Date().toISOString()
      }
    };

    // Add warnings if any
    const allWarnings = [
      ...(parseResult.warnings || []),
      ...phoneErrors
    ];

    if (allWarnings.length > 0) {
      response.warnings = allWarnings;
    }

    console.log(`✅ Successfully processed ${processedMessageRows.length} rows with ${totalMessages} total messages from ${req.file.originalname}`);
    
    if (allWarnings.length > 0) {
      console.warn(`⚠️ Processing warnings: ${allWarnings.length} issues found`);
    }

    res.json(response);

  } catch (error) {
    console.error('❌ Error processing uploaded file:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error while processing the file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get upload requirements and format information
 */
export const getUploadInfo = (req, res) => {
  res.json({
    success: true,
    requirements: {
      fileTypes: ['.xlsx', '.xls', '.csv'],
      maxFileSize: '10MB',
      columnStructure: {
        description: 'Excel file should use fixed column positions (headers can be in Arabic or English)',
        columns: [
          { position: 'A', name: 'اسم العميل / Name', description: 'Customer name (for reference only)', required: false },
          { position: 'B', name: 'الرقم المدني / Civil ID', description: 'Civil ID number (for reference only)', required: false },
          { position: 'C', name: 'هاتف 1 / Phone 1', description: 'Primary phone number', required: true },
          { position: 'D', name: 'هاتف 2 / Phone 2', description: 'Secondary phone number', required: false },
          { position: 'E', name: 'هاتف 3 / Phone 3', description: 'Third phone number', required: false },
          { position: 'F', name: '(غير مستخدم) / (Unused)', description: 'This column is ignored', required: false },
          { position: 'G', name: 'النص / Message', description: 'Complete message to send (no templates)', required: true }
        ]
      },
      phoneNumberFormat: {
        description: 'Phone numbers will be automatically formatted to E.164',
        examples: [
          '12345678 → +96512345678',
          '+96512345678 → +96512345678',
          '0096512345678 → +96512345678'
        ],
        defaultCountry: '+965 (Kuwait)'
      },
      messageHandling: {
        description: 'Messages are sent directly from column G without template processing',
        note: 'Each row with valid phone numbers will send the message from column G to all valid phones in that row'
      }
    }
  });
};
