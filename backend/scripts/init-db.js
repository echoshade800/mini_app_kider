const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
  let connection = null;
  
  try {
    console.log('🔌 Connecting to database...');
    
    // Check required environment variables
    const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.error(`❌ Missing required environment variable: ${envVar}`);
        process.exit(1);
      }
    }
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    console.log('✅ Database connected successfully');

    // Create users table
    console.log('📝 Creating users table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        uid VARCHAR(64) UNIQUE NOT NULL,
        email VARCHAR(255) NULL,
        nickname VARCHAR(255) NULL,
        meta_json JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Users table created');

    // Create levels table
    console.log('📝 Creating levels table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS levels (
        level INT PRIMARY KEY,
        stage_name VARCHAR(255) NOT NULL,
        UNIQUE KEY unique_level (level)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Levels table created');

    // Create user_progress table
    console.log('📝 Creating user_progress table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_progress (
        user_id BIGINT NOT NULL,
        current_level INT NOT NULL DEFAULT 1,
        best_level INT NOT NULL DEFAULT 0,
        change_items INT NOT NULL DEFAULT 0,
        UNIQUE KEY unique_user_progress (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ User progress table created');

    // Create user_challenge_record table
    console.log('📝 Creating user_challenge_record table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_challenge_record (
        user_id BIGINT NOT NULL,
        best_iq INT NOT NULL DEFAULT 0,
        best_iq_title VARCHAR(255) NULL,
        last_iq INT NOT NULL DEFAULT 0,
        UNIQUE KEY unique_user_challenge (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ User challenge record table created');

    // Insert 200 level names
    console.log('📚 Inserting 200 level names...');
    
    // Check if levels already exist
    const [existingLevels] = await connection.execute('SELECT COUNT(*) as count FROM levels');
    
    if (existingLevels[0].count === 0) {
      const levelValues = `
        (1,'Baby Steps'),(2,'Playpen'),(3,'Toy Blocks'),(4,'Nap Time'),(5,'Snack Break'),
        (6,'Alphabet Song'),(7,'Finger Painting'),(8,'Story Time'),(9,'Show & Tell'),(10,'Recess Fun'),
        (11,'Grade 1 – Reading Test'),(12,'Grade 1 – Spelling'),(13,'Grade 1 – Drawing'),(14,'Grade 2 – Math Quiz'),(15,'Grade 2 – Playground'),
        (16,'Grade 2 – Music Class'),(17,'Grade 3 – Science Fair'),(18,'Grade 3 – Library Day'),(19,'Grade 3 – Field Trip'),(20,'Grade 4 – Spelling Bee'),
        (21,'Grade 4 – Art Show'),(22,'Grade 4 – History Quiz'),(23,'Grade 5 – Sports Day'),(24,'Grade 5 – Book Report'),(25,'Grade 5 – Group Project'),
        (26,'Grade 6 – Lab Experiment'),(27,'Grade 6 – Debate Team'),(28,'Grade 6 – Class President'),(29,'Grade 6 – Final Review'),(30,'Grade 6 – Final Exam'),
        (31,'Grade 7 – Locker Mystery'),(32,'Grade 7 – Basketball Game'),(33,'Grade 7 – Science Quiz'),(34,'Grade 8 – Band Practice'),(35,'Grade 8 – Lunch Drama'),
        (36,'Grade 8 – Talent Show'),(37,'Grade 8 – History Project'),(38,'Grade 9 – Group Project'),(39,'Grade 9 – Chemistry Lab'),(40,'Grade 9 – Pop Quiz'),
        (41,'Grade 9 – Social Dance'),(42,'Grade 9 – Class Debate'),(43,'Grade 9 – Exam Prep'),(44,'Grade 9 – Final Review'),(45,'Grade 9 – Final Exam'),
        (46,'Freshman – Homecoming Dance'),(47,'Freshman – Algebra Quiz'),(48,'Freshman – Sports Tryouts'),(49,'Freshman – Field Trip'),(50,'Sophomore – Chemistry Lab'),
        (51,'Sophomore – Literature Essay'),(52,'Sophomore – Club Fair'),(53,'Sophomore – Art Project'),(54,'Junior – Pop Quiz'),(55,'Junior – SAT Prep'),
        (56,'Junior – Basketball Finals'),(57,'Junior – Science Fair'),(58,'Junior – Debate Night'),(59,'Junior – Class Project'),(60,'Senior – Prom Night'),
        (61,'Senior – Road Trip'),(62,'Senior – College Fair'),(63,'Senior – Senior Prank'),(64,'Senior – Graduation Prep'),(65,'Senior – Graduation Exam'),
        (66,'Freshman – Dorm Life'),(67,'Freshman – Campus Party'),(68,'Freshman – Freshman 15'),(69,'Freshman – Midterms'),(70,'Sophomore – Lecture Marathon'),
        (71,'Sophomore – All-Nighter'),(72,'Sophomore – Study Abroad'),(73,'Sophomore – Group Study'),(74,'Junior – Research Paper'),(75,'Junior – Internship Hunt'),
        (76,'Junior – Lab Partner'),(77,'Junior – Presentation Day'),(78,'Junior – Finals Week'),(79,'Senior – Senior Thesis'),(80,'Senior – Career Fair'),
        (81,'Senior – Part-Time Job'),(82,'Senior – Last Lecture'),(83,'Senior – Capstone Project'),(84,'Senior – Graduation Day'),(85,'Senior – Cap Toss'),
        (86,'Master\\'s Seminar'),(87,'Thesis Draft'),(88,'Conference Talk'),(89,'Lab Research'),(90,'Teaching Assistant'),
        (91,'Paper Submission'),(92,'Doctoral Defense'),(93,'Published Article'),(94,'Graduate Banquet'),(95,'Doctoral Hooding'),
        (96,'Lecture Hall'),(97,'Brainstorm'),(98,'Nobel Night'),(99,'Tower of Wisdom'),(100,'The Genius Summit'),
        (101,'First Job'),(102,'Office Desk'),(103,'Coffee Break'),(104,'Overtime Shift'),(105,'Team Meeting'),
        (106,'Startup Garage'),(107,'Product Pitch'),(108,'Office Politics'),(109,'First Promotion'),(110,'Big Client'),
        (111,'Lawyer\\'s Case'),(112,'Doctor\\'s Rounds'),(113,'Architect\\'s Blueprint'),(114,'Artist\\'s Studio'),(115,'Engineer\\'s Draft'),
        (116,'Journalist\\'s Scoop'),(117,'Police Patrol'),(118,'Firefighter Drill'),(119,'Nurse Duty'),(120,'Corporate Cubicle'),
        (121,'Manager\\'s Meeting'),(122,'Investor Pitch'),(123,'Startup Success'),(124,'Conference Call'),(125,'Travel for Work'),
        (126,'Boardroom Vote'),(127,'CEO\\'s Desk'),(128,'Stock Market Play'),(129,'Astronaut Training'),(130,'Mission Control'),
        (131,'Pilot\\'s Flight'),(132,'Teacher\\'s Lesson'),(133,'Professor\\'s Lecture'),(134,'Tech CEO'),(135,'Lawyer\\'s Court'),
        (136,'Doctor\\'s Surgery'),(137,'Architect\\'s Build'),(138,'Designer\\'s Show'),(139,'Actor\\'s Stage'),(140,'Singer\\'s Tour'),
        (141,'Dancer\\'s Rehearsal'),(142,'Gamer\\'s Arena'),(143,'Streamer\\'s Room'),(144,'Entrepreneur\\'s Pitch'),(145,'Corporate Merger'),
        (146,'Startup Exit'),(147,'Public Speech'),(148,'Award Ceremony'),(149,'Retirement Plan'),(150,'Legacy Project'),
        (151,'First Apartment'),(152,'Roommate Life'),(153,'Grocery Shopping'),(154,'Road Trip'),(155,'First Date'),
        (156,'Falling in Love'),(157,'Moving In'),(158,'Wedding Day'),(159,'Honeymoon'),(160,'Newborn Baby'),
        (161,'Sleepless Nights'),(162,'First Birthday'),(163,'Parenthood'),(164,'Kindergarten Drop-off'),(165,'Soccer Game'),
        (166,'Family Dinner'),(167,'Holiday Trip'),(168,'Midlife Crisis'),(169,'Marathon Finish Line'),(170,'Empty Nest'),
        (171,'Retirement Party'),(172,'Travel Abroad'),(173,'Grandkids Visit'),(174,'Anniversary'),(175,'Golden Years'),
        (176,'Garden Care'),(177,'Senior Club'),(178,'Wisdom Sharing'),(179,'Memoir Writing'),(180,'Farewell Party'),
        (181,'Virtual Reality Class'),(182,'Hologram Show'),(183,'AI Companion'),(184,'Cyberpunk City'),(185,'Time Machine'),
        (186,'Parallel Universe'),(187,'Alien Encounter'),(188,'Space Colony'),(189,'Robot Uprising'),(190,'Quantum Leap'),
        (191,'Galactic Voyage'),(192,'Wormhole Travel'),(193,'Cosmic Puzzle'),(194,'Planetary Defense'),(195,'Black Hole Edge'),
        (196,'Star Forge'),(197,'Interstellar Council'),(198,'Eternal Library'),(199,'Tower of Infinity'),(200,'The Last Horizon')
      `;
      
      await connection.execute(`INSERT INTO levels (level, stage_name) VALUES ${levelValues}`);
      console.log('✅ Successfully inserted 200 level names');
    } else {
      console.log('ℹ️  Levels already exist, skipping insert');
    }

    console.log('🎉 Database initialization completed successfully!');
    console.log('');
    console.log('You can now start the server with: npm run dev');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

initDatabase();