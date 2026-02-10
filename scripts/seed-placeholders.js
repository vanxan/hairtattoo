const{createClient}=require('@supabase/supabase-js');
const SB=createClient(
  'https://ingorrzmoudvoknhwjjb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc'
);

async function main(){
  // List renamed files in media/placeholders/
  const{data:files,error:listErr}=await SB.storage.from('media').list('placeholders',{limit:200,sortBy:{column:'name',order:'asc'}});
  if(listErr){console.error('List error:',listErr);return;}
  const paths=files.filter(f=>f.id).map(f=>'placeholders/'+f.name);
  console.log(`Found ${paths.length} placeholder images in media/placeholders/`);
  if(!paths.length){console.log('No images found. Run copy-placeholders.js first.');return;}

  // Get all listings
  const{data:listings,error:lErr}=await SB.from('listings').select('id');
  if(lErr){console.error('Listings error:',lErr);return;}
  console.log(`Found ${listings.length} listings`);

  // Get listings that already have media
  const{data:existing}=await SB.from('media').select('listing_id');
  const hasMedia=new Set((existing||[]).map(e=>e.listing_id));
  const needMedia=listings.filter(l=>!hasMedia.has(l.id));
  console.log(`${needMedia.length} listings need placeholder images`);

  if(!needMedia.length){console.log('All listings already have media. Done.');return;}

  const rows=[];
  for(const listing of needMedia){
    // Random 3-6 images per listing, shuffled differently each time
    const count=3+Math.floor(Math.random()*4);
    const shuffled=[...paths].sort(()=>Math.random()-0.5);
    const selected=shuffled.slice(0,Math.min(count,paths.length));

    for(let i=0;i<selected.length;i++){
      rows.push({
        listing_id:listing.id,
        type:'image',
        storage_path:selected[i],
        is_placeholder:true,
        sort_order:i
      });
    }
  }

  // Batch insert in chunks of 500
  const CHUNK=500;
  for(let i=0;i<rows.length;i+=CHUNK){
    const chunk=rows.slice(i,i+CHUNK);
    const{error:insErr}=await SB.from('media').insert(chunk);
    if(insErr){console.error(`Insert error at batch ${i}:`,insErr.message);return;}
    console.log(`  Inserted batch ${Math.floor(i/CHUNK)+1} (${chunk.length} rows)`);
  }

  console.log(`Done! Inserted ${rows.length} media rows for ${needMedia.length} listings`);
}
main().catch(console.error);
