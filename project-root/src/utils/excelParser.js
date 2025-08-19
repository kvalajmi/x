import XLSX from 'xlsx';

/**
 * Parse Excel file using column-based structure
 * Column A = Name (not used), B = Civil ID (not used), C = Phone1, D = Phone2, E = Phone3, G = Message
 * @param {Buffer} fileBuffer - Excel file buffer
 * @returns {Object} - { success: boolean, data?: Array, error?: string }
 */
export function parseExcelFile(fileBuffer) {
  try {
    // Read the workbook from buffer
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        error: 'No worksheets found in the Excel file'
      };
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON using array of arrays format
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // Array of arrays format
      defval: '' // Default value for empty cells
    });
    
    if (rawData.length === 0) {
      return {
        success: false,
        error: 'Excel file is empty'
      };
    }
    
    // Skip header row (row 1), process data from row 2 onward
    const dataRows = rawData.slice(1);
    
    if (dataRows.length === 0) {
      return {
        success: false,
        error: 'No data rows found in Excel file (only header row)'
      };
    }
    
    // Process data rows using column positions
    const messageRows = [];
    const errors = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // +2 because we start from row 2 (after header)
      
      try {
        const messageRow = processRowByColumns(row, rowNumber);
        if (messageRow) {
          messageRows.push(messageRow);
        }
      } catch (error) {
        errors.push(`Row ${rowNumber}: ${error.message}`);
      }
    }
    
    // Return results
    if (messageRows.length === 0) {
      return {
        success: false,
        error: `No valid message rows found. Errors: ${errors.join('; ')}`
      };
    }
    
    console.log(`✅ Successfully parsed ${messageRows.length} message rows from Excel file`);
    
    if (errors.length > 0) {
      console.warn(`⚠️ Some rows had errors: ${errors.join('; ')}`);
    }
    
    return {
      success: true,
      data: messageRows,
      warnings: errors.length > 0 ? errors : undefined,
      summary: {
        totalRows: dataRows.length,
        validRows: messageRows.length,
        errorRows: errors.length
      }
    };
    
  } catch (error) {
    console.error('❌ Error parsing Excel file:', error);
    return {
      success: false,
      error: `Failed to parse Excel file: ${error.message}`
    };
  }
}

/**
 * Process a single row using column positions
 * Column A = Name (index 0), B = Civil ID (index 1), C = Phone1 (index 2), D = Phone2 (index 3), E = Phone3 (index 4), G = Message (index 6)
 */
function processRowByColumns(row, rowNumber) {
  // Extract values by column position
  const getValue = (columnIndex) => {
    if (row[columnIndex] !== undefined && row[columnIndex] !== null) {
      return row[columnIndex].toString().trim();
    }
    return '';
  };
  
  const name = getValue(0);      // Column A (for reference only)
  const civil_id = getValue(1);  // Column B (for reference only)
  const phone1 = getValue(2);    // Column C
  const phone2 = getValue(3);    // Column D
  const phone3 = getValue(4);    // Column E
  const message = getValue(6);   // Column G
  
  // Check if this row has any phone numbers
  const phoneNumbers = [phone1, phone2, phone3].filter(phone => phone);
  
  if (phoneNumbers.length === 0) {
    throw new Error('No phone numbers found in columns C, D, or E');
  }
  
  // Check if message exists
  if (!message) {
    throw new Error('Message is required in column G');
  }
  
  // Build message row object
  const messageRow = {
    rowNumber,
    name: name || `Row ${rowNumber}`, // For reference in logs
    civil_id: civil_id || '', // For reference in logs
    message,
    phones: []
  };
  
  // Add all non-empty phone numbers
  if (phone1) messageRow.phones.push({ phone: phone1, column: 'C' });
  if (phone2) messageRow.phones.push({ phone: phone2, column: 'D' });
  if (phone3) messageRow.phones.push({ phone: phone3, column: 'E' });
  
  return messageRow;
}

/**
 * Validate Excel file format
 */
export function validateExcelFile(file) {
  const validExtensions = ['.xlsx', '.xls', '.csv'];
  const validMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ];
  
  // Check file extension
  const fileName = file.originalname || file.name || '';
  const hasValidExtension = validExtensions.some(ext => 
    fileName.toLowerCase().endsWith(ext)
  );
  
  // Check MIME type
  const hasValidMimeType = validMimeTypes.includes(file.mimetype);
  
  if (!hasValidExtension && !hasValidMimeType) {
    return {
      valid: false,
      error: `Invalid file format. Supported formats: ${validExtensions.join(', ')}`
    };
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size too large. Maximum size is 10MB'
    };
  }
  
  return { valid: true };
}
