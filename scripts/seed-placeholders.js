const{createClient}=require('@supabase/supabase-js');
const SB=createClient(
  'https://ingorrzmoudvoknhwjjb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc'
);

const PHOTOS=[
  '2.webp',
  'Beard-Enhancement-1.webp',
  'confbeards.webp',
  'foliculescalpmicropigmentation_1080x1080_782d3226-9685-4f71-a5c9-6ba4f3a37978_800x.webp',
  'hair-density-smp-women-on-point-los-angeles.webp',
  'images (1).jpeg',
  'images.jpeg',
  'IMG_6822-1.webp',
  'istockphoto-1198745727-612x612.jpg',
  'istockphoto-1359870624-612x612.jpg',
  'istockphoto-1359870647-612x612.jpg',
  'istockphoto-1455517622-612x612.jpg',
  'istockphoto-1459309841-612x612.jpg',
  'istockphoto-182490968-612x612.jpg',
  'istockphoto-2147622228-612x612.jpg',
  'istockphoto-2166038987-612x612.jpg',
  'istockphoto-2205354064-612x612.jpg',
  'istockphoto-639042482-612x612.jpg',
  'istockphoto-689527776-612x612.jpg',
  'istockphoto-932724850-612x612.jpg',
  'Scalp-Micropigmentation.png',
  'Scalp_1-1296x728-Header.webp',
  'Scar-camouflage-scalp-micropigmentation-hairline-miami-los-angeles-chicago-nyc-411x260.webp',
  'Scar_Camouflage_with_Scalp_Micropigmentation_59e317b3-e53d-4a16-aa5e-07b7c6db6d36.webp',
  'shutterstock_624234890.jpg',
  'thinning_34.webp',
  'WhatsApp-Image-2022-03-14-at-6.58.32-PM.jpeg'
];

async function main(){
  const{data:listings,error:lErr}=await SB.from('listings').select('id');
  if(lErr){console.error('Listings error:',lErr.message);return;}
  console.log(`Found ${listings.length} listings`);

  const{data:existing}=await SB.from('media').select('listing_id');
  const hasMedia=new Set((existing||[]).map(e=>e.listing_id));
  const needMedia=listings.filter(l=>!hasMedia.has(l.id));
  console.log(`${needMedia.length} listings need placeholder images`);

  if(!needMedia.length){console.log('All listings already have media.');return;}

  const rows=[];
  for(const listing of needMedia){
    const count=3+Math.floor(Math.random()*4);
    const shuffled=[...PHOTOS].sort(()=>Math.random()-0.5);
    const selected=shuffled.slice(0,count);
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

  const CHUNK=500;
  for(let i=0;i<rows.length;i+=CHUNK){
    const chunk=rows.slice(i,i+CHUNK);
    const{error:insErr}=await SB.from('media').insert(chunk);
    if(insErr){console.error(`Insert error at batch ${i}:`,insErr.message);return;}
    console.log(`Inserted batch ${Math.floor(i/CHUNK)+1} (${chunk.length} rows)`);
  }
  console.log(`Done! Inserted ${rows.length} media rows for ${needMedia.length} listings`);
}
main().catch(console.error);
