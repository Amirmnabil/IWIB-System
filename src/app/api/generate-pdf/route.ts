import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { validateRequest } from '@/lib/auth-middleware';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials missing');
    }

    // Secure the route
    await validateRequest();

    const supabase = createClient(supabaseUrl, supabaseKey);

    const data = await req.json();
    const { offerId, ...pdfData } = data;

    if (!offerId) {
      return NextResponse.json({ error: 'offerId is required' }, { status: 400 });
    }

    const { data: offer, error: fetchError } = await supabase
      .from('sme_offers')
      .select('*')
      .eq('id', offerId)
      .single();

    let resolvedPdfData = { ...pdfData };
    if (!fetchError && offer) {
      const selectedPlans = offer.selected_plans || {};
      const members = selectedPlans.members || [];
      const employeeCount = members.filter((m: any) => m.type === 'Employee' && m.isValid).length;
      const spouseCount = members.filter((m: any) => m.type === 'Spouse' && m.isValid).length;
      const childCount = members.filter((m: any) => m.type === 'Child' && m.isValid).length;

      resolvedPdfData = {
        ...resolvedPdfData,
        cashbackAmount: selectedPlans.cashbackAmount !== undefined ? selectedPlans.cashbackAmount : resolvedPdfData.cashbackAmount,
        offerCode: selectedPlans.offerCode || resolvedPdfData.offerCode,
        memberCounts: resolvedPdfData.memberCounts || {
          employee: employeeCount,
          spouse: spouseCount,
          child: childCount
        }
      };
    }

    const tempId = uuidv4();
    const inputPath = path.join(process.cwd(), 'scratch', `${tempId}.json`);
    const outputPath = path.join(process.cwd(), 'scratch', `${tempId}.pdf`);

    // Ensure scratch directory exists
    if (!fs.existsSync(path.join(process.cwd(), 'scratch'))) {
      fs.mkdirSync(path.join(process.cwd(), 'scratch'));
    }

    // Write input data for Python
    fs.writeFileSync(inputPath, JSON.stringify(resolvedPdfData));

    // Execute Python script (try py, python, then python3)
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
      // Try 'py' first (common on Windows)
      await runPython('py');
    } catch (e) {
      console.warn(`'py' command failed, trying 'python'...`);
      try {
        await runPython('python');
      } catch (e2) {
        console.warn(`'python' command failed, trying 'python3'...`);
        try {
          await runPython('python3');
        } catch (e3: any) {
          throw new Error(`Python execution failed: ${e3.message}`);
        }
      }
    }

    // Read the generated PDF
    const pdfBuffer = fs.readFileSync(outputPath);

    // Ensure storage bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find(b => b.id === 'documents')) {
      console.log('Creating missing "documents" bucket...');
      await supabase.storage.createBucket('documents', { public: true });
    }

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
