const { createClient } = require('@supabase/supabase-js');

const SB = createClient(
  'https://ingorrzmoudvoknhwjjb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc'
);

function slugify(name, city, state) {
  return (name + '-' + city + '-' + state)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const newListings = [
  // ===== VERMONT (VT) — 0 existing =====
  {
    name: 'Inked Arches Permanent Makeup',
    city: 'Barre', state: 'VT',
    address: '14 N Main Street, #1003', zip: '05641',
    phone: '(802) 323-3478',
    website: 'https://square.site/book/T1C839VHFNJ81/inked-arches-permanent-makeup-barre-vt',
    lat: 44.1970, lng: -72.5020,
    services: ['Scalp Micropigmentation', 'Microblading', 'Scar Camouflage', 'Permanent Makeup'],
    about: 'Owned by Tracy Russell, RN, with 13+ years nursing experience. Licensed cosmetic tattoo artist offering SMP, microblading, powder brows, eyeliner, lip blush, and scar camouflage in central Vermont.'
  },
  // ===== WEST VIRGINIA (WV) — 0 existing =====
  {
    name: 'Mountain Momma Spa',
    city: 'Cross Lanes', state: 'WV',
    website: 'https://mountainmommaspa.com/',
    lat: 38.4218, lng: -81.7854,
    services: ['Scalp Micropigmentation', 'Permanent Makeup'],
    about: 'Located just minutes from Charleston, Mountain Momma Spa offers professional scalp micropigmentation and permanent makeup services including brows, eyeliner, lips, and freckles in West Virginia.'
  },
  {
    name: 'Micro Scalp Innovation',
    city: 'Falling Waters', state: 'WV',
    website: 'https://microscalpinnovation.com/',
    lat: 39.5929, lng: -77.8492,
    services: ['Scalp Micropigmentation'],
    about: 'Founded by Carlos Davis and Wendy Davis, Micro Scalp Innovation offers specialized scalp micropigmentation services in West Virginia\'s eastern panhandle, serving clients throughout the tri-state area.'
  },
  // ===== ALASKA (AK) — 0 existing (adding to get 1+) =====
  {
    name: 'FikaUS',
    city: 'Anchorage', state: 'AK',
    website: 'https://www.fikaus.com/',
    lat: 61.2181, lng: -149.9003,
    services: ['Scalp Micropigmentation', 'Permanent Makeup', 'Microblading', 'Lash Extensions'],
    about: 'FikaUS brings professional scalp micropigmentation and permanent cosmetics to Alaska. Offering SMP, microblading, ombre brows, lip tattoo, eyeliner tattoo, and lash extensions in Anchorage.'
  },
  // ===== ARKANSAS (AR) =====
  {
    name: 'JMyles Barbershop',
    city: 'Searcy', state: 'AR',
    address: '3005 Hawkins Drive',
    website: 'https://www.jmylesbarbershop.com/',
    lat: 35.2506, lng: -91.7360,
    services: ['Scalp Micropigmentation', 'Barbering'],
    about: 'Master barber with 20 years of experience offering scalp micropigmentation services in Searcy, Arkansas. Combining traditional barbering expertise with modern SMP techniques.'
  },
  {
    name: 'Lunar Body Art',
    city: 'Conway', state: 'AR',
    address: '1150 North Museum Road, Ste 105',
    website: 'https://lunarbodyart.com/',
    lat: 35.0887, lng: -92.4421,
    services: ['Scalp Micropigmentation', 'Permanent Makeup'],
    about: 'Lunar Body Art provides professional permanent makeup and scalp micropigmentation services in Conway, Arkansas, serving clients throughout central Arkansas.'
  },
  {
    name: 'Evolution Solutions',
    city: 'Fort Smith', state: 'AR',
    website: 'https://www.evolutionsolutions.llc/',
    lat: 35.3859, lng: -94.3985,
    services: ['Scalp Micropigmentation'],
    about: 'Led by practitioner Andrew Gallardo, Evolution Solutions specializes in scalp micropigmentation in Fort Smith, Arkansas. Offering natural-looking SMP results for hair loss, density, and scar camouflage.'
  },
  // ===== DELAWARE (DE) =====
  {
    name: 'Delaware Scalp Micropigmentation',
    city: 'Wilmington', state: 'DE',
    address: '2601 Annand Drive, Unit #16', zip: '19808',
    phone: '(302) 292-0380',
    website: 'https://delawarescalpmicropigmentation.com/',
    lat: 39.7391, lng: -75.5860,
    services: ['Scalp Micropigmentation', 'Scar Camouflage', 'Density Enhancement', 'Custom Hairlines'],
    about: 'Founded by Joey Saienni, the first SMP practitioner in Delaware with over 2,500 sessions and 600+ clients. Specializing in SMP, scar camouflage, density enhancement, and custom hairlines.'
  },
  // ===== HAWAII (HI) =====
  {
    name: 'Scalp Society',
    city: 'Honolulu', state: 'HI',
    address: '1451 S King St', zip: '96814',
    phone: '(808) 807-4783',
    website: 'https://scalpsociety.com/',
    lat: 21.2982, lng: -157.8422,
    services: ['Scalp Micropigmentation'],
    about: 'Scalp Society is Honolulu\'s dedicated scalp micropigmentation studio, open seven days a week. Specializing exclusively in SMP treatments for hair loss, density, and hairline restoration in Hawaii.'
  },
  {
    name: 'YAMA Studios',
    city: 'Honolulu', state: 'HI',
    website: 'https://yamastudios.co/',
    lat: 21.3069, lng: -157.8583,
    services: ['Scalp Micropigmentation', 'Microblading', 'Lip Blush', 'Eyeliner'],
    about: 'YAMA Studios offers premium scalp micropigmentation alongside microblading, lip blush, and eyeliner services in Honolulu. Bringing artistry and precision to permanent cosmetics in Hawaii.'
  },
  {
    name: 'Maui Hair Tattoo',
    city: 'Lahaina', state: 'HI',
    website: 'https://www.mauihairtattoo.com/',
    lat: 20.8783, lng: -156.6825,
    services: ['Scalp Micropigmentation'],
    about: 'Maui Hair Tattoo, led by practitioner Leilani, brings professional scalp micropigmentation to Maui, Hawaii. Specializing in natural-looking SMP treatments in a paradise setting.'
  },
  // ===== IDAHO (ID) =====
  {
    name: 'Scalp Micro Boise',
    city: 'Garden City', state: 'ID',
    address: '7971 W Marigold St',
    phone: '(208) 405-9081',
    website: 'https://www.scalpmicroboise.com/',
    lat: 43.6524, lng: -116.2824,
    services: ['Scalp Micropigmentation'],
    about: 'Established in 2015, Scalp Micro Boise is Idaho\'s premier scalp micropigmentation studio. Offering expert SMP treatments for hair loss, hairline restoration, and density enhancement in the Boise area.'
  },
  {
    name: 'SMP INK CDA',
    city: "Coeur d'Alene", state: 'ID',
    website: 'https://www.smpinkcda.com/',
    lat: 47.6777, lng: -116.7805,
    services: ['Scalp Micropigmentation'],
    about: 'SMP INK CDA is a collective of barbers and medical professionals specializing in scalp micropigmentation in northern Idaho. One of five SMP INK clinics nationwide, serving the Coeur d\'Alene area.'
  },
  // ===== IOWA (IA) =====
  {
    name: 'NOVUS SMP',
    city: 'Sioux City', state: 'IA',
    website: 'https://www.novussmp.com/',
    lat: 42.4963, lng: -96.4050,
    services: ['Scalp Micropigmentation'],
    about: 'NOVUS SMP provides professional scalp micropigmentation services in Sioux City, Iowa. Offering modern SMP techniques for natural-looking hair loss solutions.'
  },
  {
    name: 'iOWA iBROW iLASH Academy & Spa',
    city: 'Waukee', state: 'IA',
    address: '154 SE Laurel St, Suite 154', zip: '50263',
    website: 'https://www.iowaibrowilashacademy.com/',
    lat: 41.6114, lng: -93.8855,
    services: ['Scalp Micropigmentation', 'Microblading', 'Lip Blush', 'Lash Extensions'],
    about: 'Owned by Tammy Johnson, iOWA iBROW iLASH offers scalp micropigmentation, microblading, lip blush, and lash extensions in the Des Moines metro area. Training academy and spa in Waukee, Iowa.'
  },
  {
    name: 'Complexions Beauty Lab',
    city: 'Davenport', state: 'IA',
    website: 'https://complexionsbeautylab.com/',
    lat: 41.5236, lng: -90.5776,
    services: ['Scalp Micropigmentation', 'Permanent Makeup'],
    about: 'Complexions Beauty Lab offers scalp micropigmentation and permanent makeup services in Davenport, Iowa. Serving the Quad Cities area with professional cosmetic tattooing.'
  },
  // ===== MAINE (ME) =====
  {
    name: 'A Handful Salon',
    city: 'Scarborough', state: 'ME',
    website: 'https://ahandfulsalon.com/',
    lat: 43.5781, lng: -70.3217,
    services: ['Scalp Micropigmentation', 'Permanent Makeup', 'Permanent Makeup Removal'],
    about: 'Led by practitioner Corey, A Handful Salon offers professional scalp micropigmentation, permanent makeup, and permanent makeup removal services in Scarborough, Maine.'
  },
  {
    name: 'Permanent Makeup & Aesthetics Maine',
    city: 'Lewiston', state: 'ME',
    website: 'https://permanentmakeupinmaine.com/',
    lat: 44.1004, lng: -70.2148,
    services: ['Scalp Micropigmentation', 'Permanent Makeup', 'Medical Micro-Pigmentation'],
    about: 'Serving Lewiston, Saco, and Freeport, this practice offers scalp pigmentation, permanent makeup, and medical micro-pigmentation throughout southern Maine.'
  },
  // ===== MISSISSIPPI (MS) =====
  {
    name: 'Gemini Inked',
    city: 'Jackson', state: 'MS',
    phone: '(205) 235-3878',
    website: 'https://www.geminiinked.com/smp-jackson',
    lat: 32.2988, lng: -90.1848,
    services: ['Scalp Micropigmentation', 'Scar Camouflage', 'Eyebrow Micropigmentation'],
    about: 'Gemini Inked brings their Hyperrealism Method to Mississippi\'s capital region, serving Jackson, Ridgeland, Madison, and the Metro area with cutting-edge scalp micropigmentation.'
  },
  // ===== MONTANA (MT) =====
  {
    name: 'Permanent Cosmetics Center of Montana',
    city: 'Bozeman', state: 'MT',
    address: '85 Mill Town Loop, Studio Z Unit A', zip: '59718',
    phone: '(406) 370-3705',
    website: 'https://permanentmakeup.org/',
    lat: 45.6770, lng: -111.0429,
    services: ['Scalp Micropigmentation', 'Permanent Cosmetics', 'SMP Training'],
    about: 'Led by DeEtte Balfourd, the Permanent Cosmetics Center of Montana offers professional scalp micropigmentation and permanent cosmetics in Bozeman. Also provides SMP training for aspiring practitioners.'
  },
  {
    name: 'Essence Medical Spa',
    city: 'Billings', state: 'MT',
    phone: '(406) 969-1089',
    website: 'https://essencemspa.com/',
    lat: 45.7833, lng: -108.5007,
    services: ['Scalp Micropigmentation', 'Hair Micropigmentation', 'Permanent Makeup'],
    about: 'Essence Medical Spa provides scalp micropigmentation and hair micropigmentation alongside permanent makeup services in Billings, Montana.'
  },
  // ===== NEBRASKA (NE) =====
  {
    name: 'Michele Strom Image Consulting',
    city: 'Omaha', state: 'NE',
    phone: '(402) 715-9213',
    website: 'https://www.michelestrom.com/',
    lat: 41.2565, lng: -95.9345,
    services: ['Scalp Micropigmentation', 'Eyebrow Microblading', 'Micropigmentation Artistry'],
    about: 'Michele Strom offers professional scalp micropigmentation and micropigmentation artistry in Omaha, Nebraska. Expert in SMP and eyebrow microblading techniques.'
  },
  {
    name: 'KCole Studio',
    city: 'Omaha', state: 'NE',
    website: 'https://kcolestudio.com/',
    lat: 41.2524, lng: -96.0100,
    services: ['Scalp Micropigmentation', 'Scar Treatment'],
    about: 'KCole Studio specializes in scalp micropigmentation and scar treatment in Omaha, Nebraska. Offering hard, soft, or hybrid hairlines tailored to each client.'
  },
  // ===== NEW HAMPSHIRE (NH) =====
  {
    name: '603 SMP & Advanced Scalp Solutions',
    city: 'Salem', state: 'NH',
    website: 'https://www.advancedscalpsolutions.com/',
    lat: 42.7886, lng: -71.2009,
    services: ['Scalp Micropigmentation'],
    about: 'With 14+ years in hair restoration and over 6.5 years of SMP experience, 603 SMP is New Hampshire\'s leading scalp micropigmentation provider in Salem.'
  },
  {
    name: 'EyEnvy Beauty Studio & Academy',
    city: 'Londonderry', state: 'NH',
    phone: '(603) 548-0386',
    website: 'https://www.eyenvybeautystudio.com/',
    lat: 42.8651, lng: -71.3739,
    services: ['Scalp Micropigmentation', 'Permanent Makeup'],
    about: 'EyEnvy Beauty Studio & Academy offers professional scalp micropigmentation and permanent makeup services in Londonderry, New Hampshire.'
  },
  // ===== NEW MEXICO (NM) =====
  {
    name: 'FitShop Med Spa',
    city: 'Albuquerque', state: 'NM',
    address: '5010 Cutler Ave NE',
    website: 'https://www.fitshopnm.com/',
    lat: 35.0844, lng: -106.6504,
    services: ['Scalp Micropigmentation'],
    about: 'FitShop Med Spa offers scalp micropigmentation using specialized SMP pigments and medical grade equipment at two Albuquerque locations. Professional SMP for hair loss solutions in New Mexico.'
  },
  {
    name: 'Royal Scalp Micro',
    city: 'Albuquerque', state: 'NM',
    address: '1330 San Pedro Dr NE, Ste 205O', zip: '87110',
    lat: 35.0992, lng: -106.5822,
    services: ['Scalp Micropigmentation', 'Nonsurgical Hair Loss Treatment'],
    about: 'Royal Scalp Micro provides specialized scalp micropigmentation and nonsurgical hair loss treatments in Albuquerque, New Mexico.'
  },
  // ===== NORTH DAKOTA (ND) =====
  {
    name: 'Tailor Made Barber Studio',
    city: 'Fargo', state: 'ND',
    website: 'https://www.tailormadebarberstudio.com/',
    lat: 46.8772, lng: -96.7898,
    services: ['Scalp Micropigmentation', 'Barbering'],
    about: 'Tailor Made Barber Studio offers non-surgical scalp micropigmentation in Fargo, North Dakota. Pigment deposits create a natural shaved-head illusion, disguising baldness and thinning hair.'
  },
  // ===== RHODE ISLAND (RI) =====
  {
    name: 'ScalpMasters',
    city: 'Cranston', state: 'RI',
    address: '845 Oaklawn Ave, Unit 103', zip: '02920',
    website: 'https://www.scalpmastersri.com/',
    lat: 41.7798, lng: -71.4373,
    services: ['Scalp Micropigmentation'],
    about: 'Founded by Michael with over 2,000 SMP treatments since 2016, ScalpMasters is Rhode Island\'s premier scalp micropigmentation studio in Cranston.'
  },
  {
    name: 'Dynamic Men\'s Grooming',
    city: 'East Greenwich', state: 'RI',
    address: '1000 Division St #50', zip: '02818',
    phone: '(401) 398-7497',
    website: 'https://www.dynamic-smp.com/',
    lat: 41.6601, lng: -71.4595,
    services: ['Scalp Micropigmentation'],
    about: 'With 20 years of barbering experience, Dynamic Men\'s Grooming offers professional scalp micropigmentation in East Greenwich, Rhode Island.'
  },
  // ===== SOUTH DAKOTA (SD) =====
  {
    name: 'Scalp Pro',
    city: 'Sioux Falls', state: 'SD',
    address: '400 N Main Ave #204', zip: '57104',
    phone: '(605) 212-0977',
    website: 'https://scalppro.com/',
    lat: 43.5460, lng: -96.7313,
    services: ['Scalp Micropigmentation', '3D Hair Follicle Replication'],
    about: 'The Midwest\'s premier SMP studio with 5-star reviews and 28+ testimonials. Scalp Pro offers certified 3D hair follicle replication and scalp micropigmentation in Sioux Falls, South Dakota.'
  },
  {
    name: 'Jane Lee Studio',
    city: 'Sioux Falls', state: 'SD',
    address: '2500 S. Lorraine Pl.',
    website: 'https://www.janeleestudio.com/',
    lat: 43.5283, lng: -96.7002,
    services: ['Scalp Micropigmentation', 'Permanent Makeup'],
    about: 'Jane Lee Studio features certified SMP artist Nessa Wold, offering scalp micropigmentation in Sioux Falls, South Dakota. Provides free services for cancer survivors.'
  },
  // ===== WYOMING (WY) =====
  {
    name: 'Forever Flawless Permanent Cosmetics',
    city: 'Sheridan', state: 'WY',
    address: '155 W Loucks St', zip: '82801',
    website: 'https://foreverflawlesswy.com/',
    lat: 44.7972, lng: -106.9563,
    services: ['Scalp Micropigmentation', 'Tricopigmentation', 'Scar Camouflage', 'Permanent Makeup'],
    about: 'Owned by Paige Pozos, Forever Flawless has performed over 13,000 procedures. Licensed in Wyoming, Montana, Las Vegas, and San Francisco. Scalp Tricopigmentation Specialist in Sheridan, Wyoming.'
  },
  // ===== ALABAMA (AL) =====
  {
    name: 'Creative Scalps Alabama',
    city: 'Chelsea', state: 'AL',
    address: '109 Foothills Parkway, Suite 103', zip: '35043',
    phone: '(866) 600-3737',
    website: 'https://creativescalpsalabama.com/',
    lat: 33.3401, lng: -86.6305,
    services: ['Scalp Micropigmentation', 'Scar Camouflage', 'Alopecia Treatment'],
    about: 'Led by artist John Douglas, Creative Scalps Alabama specializes in scalp micropigmentation for hair loss, alopecia, and scar camouflage in the Birmingham metro area.'
  },
  {
    name: 'Creative Scalp Ink',
    city: 'Huntsville', state: 'AL',
    address: '701 Pratt Ave NW, Suite 103', zip: '35801',
    website: 'https://creativescalpink.com/',
    lat: 34.7304, lng: -86.5861,
    services: ['Scalp Micropigmentation', 'Permanent Scalp Solutions'],
    about: 'Founded by a master barber with 18 years of experience, Creative Scalp Ink delivers professional scalp micropigmentation and permanent scalp solutions in Huntsville, Alabama.'
  },
  // ===== KENTUCKY (KY) =====
  {
    name: 'Scalp Solutions Kentucky',
    city: 'Louisville', state: 'KY',
    address: '1850 S Hurstbourne Pkwy #14', zip: '40220',
    phone: '(502) 627-0355',
    website: 'https://scalpsolutionskentucky.com/',
    lat: 38.2148, lng: -85.5807,
    services: ['Scalp Micropigmentation'],
    about: 'Owned by Theresa Judd with 20+ years in the micropigmentation industry. Scalp Solutions Kentucky offers professional SMP for men and women at Sola Salons in Louisville.'
  },
  {
    name: 'Prince Micro USA',
    city: 'Lexington', state: 'KY',
    address: '1719 North Broadway, Suite 5', zip: '40505',
    phone: '(859) 608-3011',
    email: 'smp@rbmicropigmentation.com',
    website: 'https://princemicrousa.com/',
    lat: 38.0598, lng: -84.4956,
    services: ['Scalp Micropigmentation'],
    about: 'Led by CEO Renato Benites, Prince Micro USA provides expert scalp micropigmentation treatments in Lexington, Kentucky.'
  },
  // ===== LOUISIANA (LA) =====
  {
    name: 'Exclusive Experience Company',
    city: 'Lafayette', state: 'LA',
    address: '1042 Camellia Blvd, Ste 3', zip: '70508',
    phone: '(337) 345-8251',
    website: 'https://www.exclusiveexperiencecompany.com/',
    lat: 30.1810, lng: -92.0659,
    services: ['Scalp Micropigmentation', 'Hair Replacement', 'Barbering'],
    about: 'Lafayette\'s premier barbershop specializing in SMP and hair replacement services. Certified specialists with private suites and a luxurious men\'s grooming lounge.'
  },
  {
    name: 'Revision Ink',
    city: 'Broussard', state: 'LA',
    phone: '(337) 945-0631',
    email: 'revision.ink@gmail.com',
    website: 'https://revisionink.com/',
    lat: 30.1460, lng: -91.9584,
    services: ['Scalp Micropigmentation', 'Microblading', 'Scar Revision', '3D Areola Tattoo'],
    about: 'Revision Ink specializes in scalp micropigmentation, microblading, scar revision, and 3D areola tattoo services in Broussard, Louisiana, near Lafayette.'
  },
  // ===== MASSACHUSETTS (MA) =====
  {
    name: 'Scalp Designs',
    city: 'Milton', state: 'MA',
    address: '464 Granite Ave',
    phone: '(508) 505-8106',
    email: 'johnscalpdesigns@gmail.com',
    website: 'https://scalpdesigns.com/',
    lat: 42.2495, lng: -71.0662,
    services: ['Scalp Micropigmentation', 'Customized Scalp Treatments'],
    about: 'Scalp Designs provides customized scalp micropigmentation treatments in Milton, Massachusetts, near Boston. Expert SMP for natural-looking hair restoration results.'
  },
  {
    name: 'Supreme SMP',
    city: 'Wilmington', state: 'MA',
    address: '200 Jefferson Rd, Ste 103', zip: '01887',
    phone: '(978) 328-0916',
    email: 'stevensupreme.smp@gmail.com',
    website: 'https://supremesmp.com/',
    lat: 42.5612, lng: -71.1729,
    services: ['Scalp Micropigmentation', 'Hair Replication'],
    about: 'Supreme SMP, led by artist Steven Rodriguez, specializes in scalp micropigmentation and hair replication in Wilmington, Massachusetts.'
  },
  // ===== OKLAHOMA (OK) =====
  {
    name: 'Sascha Jade Ink',
    city: 'Oklahoma City', state: 'OK',
    address: '421 NW 10th Street', zip: '73103',
    phone: '(405) 609-4420',
    email: 'saschajadeink@gmail.com',
    website: 'https://saschajade-ink.com/',
    lat: 35.4774, lng: -97.5228,
    services: ['Scalp Micropigmentation', 'Microblading', 'Lip Blush', 'Permanent Makeup'],
    about: 'CMM certified micropigmentologist Sascha Jade offers scalp micropigmentation, microblading, lip blush, and permanent makeup in Oklahoma City.'
  },
  {
    name: 'Prime Line OKC',
    city: 'Oklahoma City', state: 'OK',
    website: 'https://primelineokc.com/',
    lat: 35.4676, lng: -97.5164,
    services: ['Scalp Micropigmentation', '3D Scalp Micropigmentation'],
    about: 'Oklahoma\'s first dedicated scalp micropigmentation service. Prime Line OKC offers 3D scalp micropigmentation for natural-looking hair loss solutions in Oklahoma City.'
  },
  // ===== PENNSYLVANIA (PA) =====
  {
    name: 'Royal SMP Solutions',
    city: 'Irwin', state: 'PA',
    address: '7710 Lincoln Hwy', zip: '15642',
    phone: '(724) 516-0429',
    website: 'https://royalsmpsolutions.com/',
    lat: 40.3243, lng: -79.7009,
    services: ['Scalp Micropigmentation'],
    about: 'Royal SMP Solutions provides professional scalp micropigmentation services in the Pittsburgh area from their Irwin, Pennsylvania studio.'
  },
  {
    name: 'Outline Ink Studios',
    city: 'Lancaster', state: 'PA',
    website: 'https://outlineinkstudios.com/',
    lat: 40.0379, lng: -76.3055,
    services: ['Scalp Micropigmentation', 'Hairline Restoration'],
    about: 'Led by practitioner Vic with 12+ years of experience and 10,000+ client treatments, Outline Ink Studios is Lancaster, Pennsylvania\'s premier SMP studio.'
  },
  {
    name: 'Tailored Micro Ink',
    city: 'Allentown', state: 'PA',
    website: 'https://tailoredmicro.com/',
    lat: 40.6084, lng: -75.4902,
    services: ['Scalp Micropigmentation'],
    about: 'The Lehigh Valley\'s premier scalp micropigmentation studio, Tailored Micro Ink offers customized SMP treatments in Allentown, Pennsylvania.'
  },
  // ===== UTAH (UT) =====
  {
    name: 'Rejuvenate SMP',
    city: 'Salt Lake City', state: 'UT',
    address: '140 W 2100 S Expy 134 A', zip: '84115',
    phone: '(801) 792-7362',
    website: 'https://rejuvenatesmp.com/',
    lat: 40.7229, lng: -111.8942,
    services: ['Scalp Micropigmentation'],
    about: 'Rejuvenate SMP provides non-surgical SMP hair loss solutions in Salt Lake City, Utah. Specializing in natural-looking scalp micropigmentation treatments.'
  },
  {
    name: 'Revive Ink',
    city: 'Riverton', state: 'UT',
    website: 'https://reviveinkutah.com/',
    lat: 40.5219, lng: -111.9391,
    services: ['Scalp Micropigmentation', 'Cosmetic Hair Tattoo'],
    about: 'Located in Mountain View Village, Revive Ink offers professional scalp micropigmentation and cosmetic hair tattoo services in Riverton, Utah.'
  },
  // ===== WASHINGTON DC =====
  {
    name: 'Skalp Ink Micropigmentation',
    city: 'Largo', state: 'MD',
    address: '9701 Apollo Dr, Suite 343', zip: '20774',
    phone: '(301) 575-6979',
    email: 'info@SkalpInk.com',
    website: 'https://skalpink.com/',
    lat: 38.8970, lng: -76.8302,
    services: ['Scalp Micropigmentation', 'Alopecia Treatment', 'Scar Camouflage'],
    about: 'Founded by Rodney J. Waters with 20+ years in the hair industry as a master barber, Skalp Ink serves the Washington DC metro area with professional SMP, alopecia treatment, and scar camouflage.'
  },
  // ===== KANSAS (KS) =====
  {
    name: 'Midwest SMP',
    city: 'Wichita', state: 'KS',
    website: 'https://midwestsmp.com/',
    lat: 37.6872, lng: -97.3301,
    services: ['Scalp Micropigmentation', 'Microblading'],
    about: 'Led by Javier Garcia with 14+ years as a master barber and certified SMP practitioner, Midwest SMP offers professional scalp micropigmentation and microblading in Wichita, Kansas.'
  },
  // ===== MICHIGAN (MI) =====
  {
    name: 'The Skull Bar',
    city: 'Royal Oak', state: 'MI',
    address: '486 N Main St, Suite 30', zip: '48067',
    phone: '(248) 934-1674',
    email: 'Theskullbardetroit@gmail.com',
    website: 'https://theskullbardetroit.com/',
    lat: 42.4895, lng: -83.1446,
    services: ['Scalp Micropigmentation'],
    about: 'Founded by veteran Jassin Hakim, The Skull Bar offers professional scalp micropigmentation and free consultations in Royal Oak, Michigan, serving the Detroit metro area.'
  },
  {
    name: 'Scalp Aesthetics Dearborn',
    city: 'Dearborn', state: 'MI',
    address: '24619 Ford Road', zip: '48187',
    phone: '(313) 333-6262',
    website: 'https://scalpaestheticsdearborn.com/',
    lat: 42.3189, lng: -83.2571,
    services: ['Scalp Micropigmentation', 'Alopecia Treatment'],
    about: 'Scalp Aesthetics Dearborn provides scalp micropigmentation and alopecia treatment services in Dearborn, Michigan.'
  },
  // ===== NEVADA (NV) =====
  {
    name: 'SMP INK Las Vegas',
    city: 'Las Vegas', state: 'NV',
    address: '430 S Rampart Blvd, Ste 150 Room C',
    phone: '(702) 277-7044',
    email: 'tyler@smp-ink.com',
    website: 'https://smp-ink.com/',
    lat: 36.1616, lng: -115.2972,
    services: ['Scalp Micropigmentation', 'Density Fill', 'Hairline Restoration'],
    about: 'SMP INK Las Vegas offers expert scalp micropigmentation, density fill, and hairline restoration treatments on the Las Vegas Strip.'
  },
  {
    name: 'Alpha Micropigmentation',
    city: 'Las Vegas', state: 'NV',
    address: '4015 S El Capitan Way, Ste 888', zip: '89147',
    website: 'https://alphamicropigmentation.com/',
    lat: 36.1188, lng: -115.2695,
    services: ['Scalp Micropigmentation'],
    about: 'Alpha Micropigmentation is the premier SMP clinic in Las Vegas with over 25 years of industry experience. Open seven days a week for scalp micropigmentation treatments.'
  },
  // ===== INDIANA (IN) =====
  {
    name: 'Indy Scalp Design',
    city: 'Indianapolis', state: 'IN',
    address: '845 E 65th St', zip: '46220',
    phone: '(317) 762-4962',
    website: 'https://indyscalpdesign.com/',
    lat: 39.8685, lng: -86.1419,
    services: ['Scalp Micropigmentation'],
    about: 'Founded by Brian, Indy Scalp Design is the first dedicated SMP studio of its kind in Indianapolis. Offering professional scalp micropigmentation in the Broadripple neighborhood.'
  },
  // ===== MISSOURI (MO) =====
  {
    name: 'Scalp Headquarters',
    city: 'Kansas City', state: 'MO',
    address: '107 W 9th Street, #320', zip: '64105',
    phone: '(913) 428-6936',
    website: 'https://scalphqkc.net/',
    lat: 39.1027, lng: -94.5846,
    services: ['Scalp Micropigmentation'],
    about: 'Founded in 2019 by Jacob Sills, certified at Good Look Ink. Scalp Headquarters offers professional SMP for men and women in downtown Kansas City, Missouri.'
  },
  // ===== WISCONSIN (WI) =====
  {
    name: 'SkalpX Milwaukee Micropigmentation',
    city: 'Milwaukee', state: 'WI',
    address: '2018 S 1st St, Suite 208', zip: '53207',
    phone: '(414) 581-6037',
    website: 'https://smpmilwaukee.com/',
    lat: 43.0143, lng: -87.9099,
    services: ['Scalp Micropigmentation'],
    about: 'Founded by Alexander Viruet with 10 years in the hair industry as a master certified barber. SkalpX Milwaukee specializes in cosmetic SMP hair tattoo services.'
  },
  {
    name: 'Hairline Solutions',
    city: 'Greenfield', state: 'WI',
    address: '7406 W Layton Ave, Ste B', zip: '53220',
    phone: '(262) 800-2525',
    website: 'https://hairlinesolutions.info/',
    lat: 42.9617, lng: -87.9886,
    services: ['Scalp Micropigmentation'],
    about: 'Rated 4.9 stars with 96 reviews, Hairline Solutions provides professional scalp micropigmentation in Greenfield, Wisconsin, near Milwaukee.'
  }
];

async function main() {
  // Check for existing slugs to avoid duplicates
  const { data: existing } = await SB.from('listings').select('slug');
  const existingSlugs = new Set((existing || []).map(l => l.slug));

  const toInsert = [];
  for (const l of newListings) {
    let slug = slugify(l.name, l.city, l.state);
    if (existingSlugs.has(slug)) {
      console.log(`SKIP (already exists): ${slug}`);
      continue;
    }
    toInsert.push({
      name: l.name,
      slug,
      city: l.city,
      state: l.state,
      address: l.address || null,
      zip: l.zip || null,
      phone: l.phone || null,
      email: l.email || null,
      website: l.website || null,
      lat: l.lat,
      lng: l.lng,
      services: l.services,
      about: l.about,
      price_range: '$'
    });
  }

  if (!toInsert.length) {
    console.log('No new listings to insert');
    return;
  }

  console.log(`Inserting ${toInsert.length} new listings...`);

  // Insert in batches of 20
  for (let i = 0; i < toInsert.length; i += 20) {
    const batch = toInsert.slice(i, i + 20);
    const { data, error } = await SB.from('listings').insert(batch).select('id, name, slug, city, state');
    if (error) {
      console.error(`Batch ${Math.floor(i/20)+1} error:`, error.message);
      // Try one by one
      for (const item of batch) {
        const { data: d, error: e } = await SB.from('listings').insert(item).select('id, name, slug, city, state');
        if (e) console.error(`  FAIL: ${item.name} - ${e.message}`);
        else console.log(`  OK: ${d[0].name} (${d[0].city}, ${d[0].state}) → id=${d[0].id}`);
      }
    } else {
      data.forEach(d => console.log(`  OK: ${d.name} (${d.city}, ${d.state}) → id=${d.id}`));
    }
  }

  // Now seed placeholder images for new listings that don't have media
  console.log('\nSeeding placeholder images for new listings...');
  const { data: allListings } = await SB.from('listings').select('id, name, slug');
  const { data: allMedia } = await SB.from('media').select('listing_id');
  const listingsWithMedia = new Set((allMedia || []).map(m => m.listing_id));

  const placeholderFiles = [
    'smp-placeholder-1.jpg', 'smp-placeholder-2.jpg', 'smp-placeholder-3.jpg',
    'smp-placeholder-4.jpg', 'smp-placeholder-5.jpg', 'smp-placeholder-6.jpg'
  ];

  let seeded = 0;
  for (const listing of (allListings || [])) {
    if (listingsWithMedia.has(listing.id)) continue;
    // Assign 3 random placeholders
    const shuffled = [...placeholderFiles].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, 3);
    const mediaRows = picks.map((p, idx) => ({
      listing_id: listing.id,
      storage_path: p,
      type: 'image',
      is_placeholder: true,
      sort_order: idx
    }));
    const { error } = await SB.from('media').insert(mediaRows);
    if (error) console.error(`  Media seed error for ${listing.name}: ${error.message}`);
    else { seeded++; }
  }
  console.log(`Seeded placeholders for ${seeded} listings`);

  // Final count
  const { count } = await SB.from('listings').select('*', { count: 'exact', head: true });
  console.log(`\nTotal listings in database: ${count}`);
}

main().catch(e => { console.error(e); process.exit(1); });
