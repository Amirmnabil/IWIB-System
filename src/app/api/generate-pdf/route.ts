import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase (assuming env vars are set)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { offerId, ...pdfData } = data;

    if (!offerId) {
      return NextResponse.json({ error: 'offerId is required' }, { status: 400 });
    }

    const tempId = uuidv4();
    const inputPath = path.join(process.cwd(), 'scratch', `${tempId}.json`);
    const outputPath = path.join(process.cwd(), 'scratch', `${tempId}.pdf`);

    // Ensure scratch directory exists
    if (!fs.existsSync(path.join(process.cwd(), 'scratch'))) {
      fs.mkdirSync(path.join(process.cwd(), 'scratch'));
    }

    // Write input data for Python
    fs.writeFileSync(inputPath, JSON.stringify(pdfData));

    // Execute Python script (try python then python3)
    const runPython = (cmd: string) => new Promise((resolve, reject) => {
      const py = spawn(cmd, [
        path.join(process.cwd(), 'scripts', 'pdf_engine.py'),
        inputPath,
        outputPath
      ]);
      
      let errorOutput = '';
      py.stderr.on('data', (data) => { errorOutput += data.toString(); });
      
      py.on('close', (code) => {
        if (code === 0) resolve(true);
        else reject(new Error(`Python (${cmd}) failed with code ${code}: ${errorOutput}`));
      });
    });

    try {
      await runPython('python');
    } catch (e) {
      console.warn(`Primary 'python' command failed, trying 'python3'...`);
      try {
        await runPython('python3');
      } catch (e2: any) {
        throw new Error(`Python execution failed: ${e2.message}`);
      }
    }

    // Read the generated PDF
    const pdfBuffer = fs.readFileSync(outputPath);

    // Upload to Supabase Storage
    const fileName = `offers/${offerId}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Update database
    const { error: updateError } = await supabase
      .from('sme_offers')
      .update({ pdf_url: publicUrl })
      .eq('id', offerId);

    if (updateError) {
        // If pdf_url column doesn't exist, we might need to use comparison_data or another field
        console.warn('Could not update pdf_url, trying comparison_data.pdf_url');
        await supabase
          .from('sme_offers')
          .update({ 
            comparison_data: { 
              ...(pdfData.comparison_data || {}), 
              pdf_url: publicUrl 
            } 
          })
          .eq('id', offerId);
    }

    // Cleanup temp files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    return NextResponse.json({ 
      success: true, 
      url: publicUrl 
    });

  } catch (error: any) {
    console.error('PDF Generation Failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
