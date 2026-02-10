const{createClient}=require('@supabase/supabase-js');
const SB=createClient(
  'https://ingorrzmoudvoknhwjjb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc'
);

async function main(){
  // List files in placeholders bucket
  const{data:files,error}=await SB.storage.from('placeholders').list('',{limit:200,sortBy:{column:'name',order:'asc'}});
  if(error){console.error('List error:',error);return;}
  const realFiles=files.filter(f=>f.id);
  console.log(`Found ${realFiles.length} files in placeholders bucket`);
  if(!realFiles.length){console.log('No files found. Exiting.');return;}

  let i=1;
  for(const file of realFiles){
    const ext=file.name.includes('.')?file.name.split('.').pop():'jpg';
    const newName=`placeholders/hair-tattoo-smp-${String(i).padStart(3,'0')}.${ext}`;

    // Download from placeholders bucket
    const{data:blob,error:dlErr}=await SB.storage.from('placeholders').download(file.name);
    if(dlErr){console.error(`Download error for ${file.name}:`,dlErr.message);continue;}

    // Upload to media bucket
    const{error:upErr}=await SB.storage.from('media').upload(newName,blob,{
      contentType:file.metadata?.mimetype||'image/jpeg',
      upsert:true
    });
    if(upErr){console.error(`Upload error for ${newName}:`,upErr.message);continue;}

    console.log(`  ${file.name} → ${newName}`);
    i++;
  }
  console.log(`Done! Copied ${i-1} files to media/placeholders/`);
}
main().catch(console.error);
