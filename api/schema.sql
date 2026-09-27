CREATE DATABASE IF NOT EXISTS charityevents_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE charityevents_db;

CREATE TABLE IF NOT EXISTS organizations (
  organization_id INT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  summary VARCHAR(500) NOT NULL,
  contact_email VARCHAR(150) NOT NULL,
  city VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  category_id INT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS events (
  event_id INT PRIMARY KEY,
  organization_id INT NOT NULL,
  category_id INT NOT NULL,
  name VARCHAR(160) NOT NULL,
  summary VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  purpose VARCHAR(300) NOT NULL,
  location_name VARCHAR(120) NOT NULL,
  suburb VARCHAR(80) NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  meeting_point VARCHAR(250) NOT NULL,
  ticket_price DECIMAL(8,2) NOT NULL DEFAULT 0,
  funding_goal DECIMAL(10,2) NOT NULL,
  funding_raised DECIMAL(10,2) NOT NULL DEFAULT 0,
  image_path VARCHAR(150) NOT NULL,
  status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  CONSTRAINT fk_events_organization FOREIGN KEY (organization_id)
    REFERENCES organizations(organization_id),
  CONSTRAINT fk_events_category FOREIGN KEY (category_id)
    REFERENCES categories(category_id),
  INDEX idx_events_date_status (status, event_date),
  INDEX idx_events_suburb (suburb)
);

INSERT INTO organizations VALUES
(1, 'Driftline', 'A Sydney community group that organises beach clean-ups, rockpool surveys and planting days.', 'hello@driftline.example', 'Sydney'),
(2, 'Driftline Field Team', 'Volunteers who coordinate planting and field survey sessions in Sydney.', 'field@driftline.example', 'Sydney')
ON DUPLICATE KEY UPDATE summary=VALUES(summary);

INSERT IGNORE INTO categories VALUES
(1, 'Beach clean-up', 'beach-cleanup'),
(2, 'Coastal restoration', 'coastal-restoration'),
(3, 'Citizen science', 'citizen-science'),
(4, 'Community gathering', 'community-gathering');

INSERT INTO events VALUES
(1,1,1,'North Bondi Beach Clean-up','Collect litter along the north end of Bondi before the beach gets busy.','Meet the team before the beach gets busy. We will work in small groups from the north end toward the promenade, collecting and sorting litter as we go. Gloves, bags and a short safety briefing are provided. Wear closed shoes and bring a refillable water bottle. All ages are welcome; children must be accompanied by an adult.','Remove small plastics and fishing line before they reach the water.','Bondi Beach','Bondi',DATE_ADD(CURDATE(), INTERVAL 14 DAY),'07:30:00','10:00:00','North Bondi Surf Life Saving Club entrance',0,1800,680,'/assets/images/hero-coast.jpg','active'),
(2,1,3,'Rockpool Watch: Coogee','Record species in Coogee rockpools at low tide.','Join a guided rockpool survey at low tide. You will learn how to record common intertidal species and photograph observations without moving animals or disturbing habitat. No science experience is needed. Sturdy shoes with grip are recommended; the route includes uneven rock.','Build a community record of intertidal life and changing conditions.','Coogee Rock Pools','Coogee',DATE_ADD(CURDATE(), INTERVAL 22 DAY),'08:00:00','10:30:00','Steps beside the southern end of Coogee Beach',0,2400,1330,'/assets/images/rockpool.jpg','active'),
(3,2,2,'Dune Care at Maroubra','Remove weeds and plant native species behind Maroubra Beach.','Work alongside local restoration volunteers to remove invasive growth and plant native coastal species behind the beach. Tools and instruction are supplied. Expect sandy ground and a little digging. Please bring a hat, water and gardening gloves if you have them.','Restore native dune habitat and reduce erosion along the beach edge.','Maroubra Beach Dunes','Maroubra',DATE_ADD(CURDATE(), INTERVAL 30 DAY),'09:00:00','12:00:00','South Maroubra Surf Life Saving Club',0,3200,980,'/assets/images/dune-grass.jpg','active'),
(4,1,1,'Blackwattle Bay Clean-up','Collect and sort shoreline litter around Blackwattle Bay.','We will collect litter from accessible paths and the shoreline around Blackwattle Bay. A team leader will explain safe collection and sorting before the group sets out. No one will enter the water. Equipment is supplied and beginners are welcome.','Stop urban litter from entering Sydney Harbour.','Blackwattle Bay','Glebe',DATE_ADD(CURDATE(), INTERVAL 38 DAY),'08:30:00','11:00:00','Glebe Foreshore walk, near Jubilee Park',0,1500,510,'/assets/images/cliffs.jpg','active'),
(5,2,4,'Shelly Beach Volunteer Lunch','Meet local volunteers over lunch after a short shoreline walk.','An informal community lunch after a short shoreline walk. Meet neighbours, hear from local volunteers and learn how to join future field days. The event is free; optional donations support gloves, bags and native plants. Bring your own lunch or pick something up nearby.','Bring new coastal volunteers together and fund practical field supplies.','Shelly Beach Reserve','Manly',DATE_ADD(CURDATE(), INTERVAL 46 DAY),'11:00:00','14:00:00','Picnic tables near the Shelly Beach car park',0,900,390,'/assets/images/shore-texture.jpg','active'),
(6,1,3,'Plastic Count: Bronte','Count and collect small plastics along Bronte Beach.','Help record small pieces of plastic found on the beach using a simple survey method. We will compare samples from different points along the strand line, then remove what we find. The session includes an introduction, field work and a shared count at the end.','Measure and remove small plastics while building a local evidence base.','Bronte Beach','Bronte',DATE_ADD(CURDATE(), INTERVAL 54 DAY),'07:45:00','10:15:00','North end of Bronte Beach, beside the steps',0,1200,730,'/assets/images/shore-texture.jpg','active'),
(7,2,2,'Little Bay Planting Day','Plant native coastal species along the Little Bay coast walk.','Spend a morning planting locally appropriate species with the field team. We will cover why the plants matter, how to protect young growth and what ongoing care looks like. Planting tools and seedlings are provided. Wear sturdy shoes and sun protection.','Strengthen native vegetation along an exposed coastal corridor.','Little Bay Coast Walk','Little Bay',DATE_ADD(CURDATE(), INTERVAL 65 DAY),'09:00:00','12:30:00','Little Bay Beach upper entrance',0,2800,1175,'/assets/images/dune-grass.jpg','active'),
(8,1,1,'North Cronulla Beach Clean-up','Remove and record litter on North Cronulla Beach.','Explore the strand line with a volunteer guide and remove litter before the next high tide. We will sort the collected material, record common items and discuss where they may have come from. Bags, gloves and pickers are available.','Clear marine debris and learn what washes onto the shore.','North Cronulla Beach','Cronulla',DATE_ADD(CURDATE(), INTERVAL 76 DAY),'09:30:00','12:00:00','North Cronulla Surf Life Saving Club',0,2000,1240,'/assets/images/hero-coast.jpg','active'),
(9,1,4,'Paused planning session','This listing is deliberately unavailable.','This planning session has been suspended and should not appear in public results.','Internal planning.','City Hall','Sydney',DATE_ADD(CURDATE(), INTERVAL 20 DAY),'10:00:00','11:00:00','City Hall',0,100,0,'/assets/images/shore-texture.jpg','suspended') ON DUPLICATE KEY UPDATE name=VALUES(name), summary=VALUES(summary), event_date=VALUES(event_date), image_path=VALUES(image_path);
