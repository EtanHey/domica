import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

// Initialize the client
const client = new DocumentProcessorServiceClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export interface ProcessorConfig {
  projectId: string;
  location: string;
  processorId: string;
}

export async function processDocument(
  documentContent: Buffer,
  mimeType: string,
  config: ProcessorConfig
): Promise<string> {
  const { projectId, location, processorId } = config;

  // Configure the request
  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

  const request = {
    name,
    rawDocument: {
      content: documentContent,
      mimeType,
    },
  };

  try {
    // Process the document
    const [result] = await client.processDocument(request);

    // Extract text from the result
    const { document } = result;
    const { text } = document || {};

    if (!text) {
      throw new Error('No text extracted from document');
    }

    return text;
  } catch (error) {
    console.error('Document AI processing error:', error);
    throw error;
  }
}

export async function processImageOrPdf(base64Content: string, mimeType: string): Promise<string> {
  // Remove data URL prefix if present
  const base64Data = base64Content.replace(/^data:.*?;base64,/, '');
  const documentContent = Buffer.from(base64Data, 'base64');

  const config: ProcessorConfig = {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
    location: process.env.GOOGLE_DOCUMENT_AI_LOCATION || 'us',
    processorId: process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID!,
  };

  return processDocument(documentContent, mimeType, config);
}
