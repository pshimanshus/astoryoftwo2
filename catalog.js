/* ============================================================
   MIXTAPE — the built-in catalogue
   A curated index of songs people actually put on love mixtapes,
   shipped with the app so search works instantly, offline, with
   no API key and no network.

   Only facts are stored: title, artist, year, mood. No audio, no
   artwork, no links — nothing that needs a licence.

   Format: [title, artist, year, moodBits]
   Kept as tuples rather than objects to stay small (~14KB).
   ============================================================ */

(() => {
  "use strict";

  /* moods as bit flags so a song can belong to several */
  const M = {
    NEW:      1 << 0,  // falling for someone
    LONGING:  1 << 1,  // wanting, aching, distance
    DEVOTION: 1 << 2,  // steady, forever, vows
    MISSING:  1 << 3,  // apart, waiting, absence
    SORRY:    1 << 4,  // apology, repair, forgiveness
    JOY:      1 << 5,  // dancing, giddy, silly happy
    SLOW:     1 << 6,  // late night, close, slow dance
    ACHE:     1 << 7,  // heartbreak, leaving, endings
  };

  const MOODS = [
    { id: "NEW",      label: "falling for you",  bit: M.NEW },
    { id: "LONGING",  label: "longing",          bit: M.LONGING },
    { id: "MISSING",  label: "missing you",      bit: M.MISSING },
    { id: "DEVOTION", label: "for good",         bit: M.DEVOTION },
    { id: "SLOW",     label: "slow dance",       bit: M.SLOW },
    { id: "JOY",      label: "silly happy",      bit: M.JOY },
    { id: "SORRY",    label: "i'm sorry",        bit: M.SORRY },
    { id: "ACHE",     label: "the ache",         bit: M.ACHE },
  ];

  const T = [
    // ---- soul, motown, classic ----
    ["My Girl", "The Temptations", 1964, M.JOY | M.DEVOTION],
    ["Ain't No Mountain High Enough", "Marvin Gaye & Tammi Terrell", 1967, M.DEVOTION | M.JOY],
    ["I Say a Little Prayer", "Aretha Franklin", 1968, M.DEVOTION | M.JOY],
    ["(Your Love Keeps Lifting Me) Higher and Higher", "Jackie Wilson", 1967, M.JOY],
    ["Let's Stay Together", "Al Green", 1972, M.DEVOTION | M.SLOW],
    ["Tired of Being Alone", "Al Green", 1971, M.LONGING],
    ["At Last", "Etta James", 1960, M.DEVOTION | M.SLOW],
    ["I Only Have Eyes for You", "The Flamingos", 1959, M.SLOW | M.DEVOTION],
    ["Unchained Melody", "The Righteous Brothers", 1965, M.MISSING | M.LONGING],
    ["Stand by Me", "Ben E. King", 1961, M.DEVOTION],
    ["A Change Is Gonna Come", "Sam Cooke", 1964, M.ACHE],
    ["Baby I Need Your Loving", "Four Tops", 1964, M.LONGING],
    ["The Tracks of My Tears", "Smokey Robinson & The Miracles", 1965, M.ACHE],
    ["Ain't No Sunshine", "Bill Withers", 1971, M.MISSING],
    ["Lovely Day", "Bill Withers", 1977, M.JOY],
    ["La La (Means I Love You)", "The Delfonics", 1968, M.SLOW],
    ["Never Too Much", "Luther Vandross", 1981, M.JOY | M.DEVOTION],
    ["If You Don't Know Me by Now", "Harold Melvin & The Blue Notes", 1972, M.DEVOTION],
    ["Just My Imagination", "The Temptations", 1971, M.LONGING],
    ["Superstar", "The Carpenters", 1971, M.LONGING | M.ACHE],

    // ---- indie / alt / the mixtape canon ----
    ["Fade Into You", "Mazzy Star", 1993, M.SLOW | M.LONGING],
    ["First Day of My Life", "Bright Eyes", 2005, M.NEW | M.DEVOTION],
    ["Such Great Heights", "The Postal Service", 2003, M.NEW | M.JOY],
    ["Sea of Love", "Cat Power", 2000, M.SLOW | M.DEVOTION],
    ["The Book of Love", "The Magnetic Fields", 1999, M.DEVOTION],
    ["Falling Slowly", "Glen Hansard & Markéta Irglová", 2007, M.NEW | M.SLOW],
    ["Harvest Moon", "Neil Young", 1992, M.SLOW | M.DEVOTION],
    ["Yellow", "Coldplay", 2000, M.NEW | M.DEVOTION],
    ["Skinny Love", "Bon Iver", 2007, M.ACHE],
    ["Re: Stacks", "Bon Iver", 2007, M.ACHE],
    ["Holocene", "Bon Iver", 2011, M.LONGING],
    ["Naked as We Came", "Iron & Wine", 2004, M.DEVOTION | M.SLOW],
    ["Flightless Bird, American Mouth", "Iron & Wine", 2007, M.SLOW],
    ["Simple Twist of Fate", "Bob Dylan", 1975, M.ACHE],
    ["If Not for You", "Bob Dylan", 1970, M.DEVOTION],
    ["In Spite of Ourselves", "John Prine & Iris DeMent", 1999, M.JOY | M.DEVOTION],
    ["I Will", "The Beatles", 1968, M.DEVOTION],
    ["Something", "The Beatles", 1969, M.DEVOTION | M.SLOW],
    ["Here, There and Everywhere", "The Beatles", 1966, M.SLOW | M.DEVOTION],
    ["In My Life", "The Beatles", 1965, M.DEVOTION],
    ["God Only Knows", "The Beach Boys", 1966, M.DEVOTION],
    ["Wouldn't It Be Nice", "The Beach Boys", 1966, M.NEW | M.JOY],
    ["This Must Be the Place", "Talking Heads", 1983, M.DEVOTION | M.JOY],
    ["Wicked Game", "Chris Isaak", 1989, M.LONGING],
    ["Lovesong", "The Cure", 1989, M.DEVOTION],
    ["Just Like Heaven", "The Cure", 1987, M.NEW | M.JOY],
    ["There Is a Light That Never Goes Out", "The Smiths", 1986, M.LONGING | M.ACHE],
    ["Asleep", "The Smiths", 1985, M.ACHE],
    ["Between the Bars", "Elliott Smith", 1997, M.ACHE | M.SLOW],
    ["Say Yes", "Elliott Smith", 1997, M.NEW],
    ["Nothing Compares 2 U", "Sinéad O'Connor", 1990, M.MISSING | M.ACHE],
    ["Linger", "The Cranberries", 1993, M.ACHE],
    ["Dreams", "Fleetwood Mac", 1977, M.ACHE],
    ["Songbird", "Fleetwood Mac", 1977, M.DEVOTION | M.SLOW],
    ["Landslide", "Fleetwood Mac", 1975, M.LONGING],
    ["Everywhere", "Fleetwood Mac", 1987, M.JOY | M.NEW],
    ["The Luckiest", "Ben Folds", 2001, M.DEVOTION],
    ["Chasing Cars", "Snow Patrol", 2006, M.SLOW | M.DEVOTION],
    ["Heartbeats", "José González", 2003, M.LONGING],
    ["I Want You", "Elvis Costello", 1986, M.LONGING | M.ACHE],
    ["Alison", "Elvis Costello", 1977, M.ACHE],
    ["She's Always a Woman", "Billy Joel", 1977, M.DEVOTION],
    ["Vienna", "Billy Joel", 1977, M.DEVOTION],
    ["Thirteen", "Big Star", 1972, M.NEW],
    ["Cannonball", "The Breeders", 1993, M.JOY],
    ["Beast of Burden", "The Rolling Stones", 1978, M.SLOW],
    ["Wild Horses", "The Rolling Stones", 1971, M.ACHE | M.DEVOTION],
    ["Into My Arms", "Nick Cave & The Bad Seeds", 1997, M.DEVOTION],
    ["The Ship Song", "Nick Cave & The Bad Seeds", 1990, M.DEVOTION],
    ["Hallelujah", "Jeff Buckley", 1994, M.ACHE | M.SLOW],
    ["Lover, You Should've Come Over", "Jeff Buckley", 1994, M.LONGING | M.SORRY],
    ["Dance Me to the End of Love", "Leonard Cohen", 1984, M.SLOW | M.DEVOTION],
    ["So Long, Marianne", "Leonard Cohen", 1967, M.ACHE],
    ["Moon River", "Audrey Hepburn", 1961, M.SLOW],
    ["La Vie en rose", "Édith Piaf", 1947, M.SLOW | M.DEVOTION],
    ["Ne me quitte pas", "Jacques Brel", 1959, M.LONGING | M.SORRY],
    ["The Very Thought of You", "Nat King Cole", 1958, M.LONGING | M.SLOW],
    ["L-O-V-E", "Nat King Cole", 1965, M.JOY],
    ["Fly Me to the Moon", "Frank Sinatra", 1964, M.SLOW | M.JOY],
    ["The Way You Look Tonight", "Frank Sinatra", 1964, M.SLOW | M.DEVOTION],
    ["Cheek to Cheek", "Ella Fitzgerald & Louis Armstrong", 1956, M.SLOW | M.JOY],
    ["My Funny Valentine", "Chet Baker", 1954, M.SLOW | M.LONGING],
    ["I Fall in Love Too Easily", "Chet Baker", 1954, M.NEW | M.LONGING],
    ["Feeling Good", "Nina Simone", 1965, M.JOY],
    ["I Put a Spell on You", "Nina Simone", 1965, M.LONGING],
    ["Ne Me Quitte Pas", "Nina Simone", 1965, M.LONGING],
    ["Blue in Green", "Miles Davis", 1959, M.SLOW],
    ["In a Sentimental Mood", "Duke Ellington & John Coltrane", 1963, M.SLOW],

    // ---- city pop & japanese ----
    ["Plastic Love", "Mariya Takeuchi", 1984, M.LONGING | M.ACHE],
    ["Stay With Me", "Miki Matsubara", 1979, M.LONGING],
    ["Ride on Time", "Tatsuro Yamashita", 1980, M.JOY],
    ["Sparkle", "Tatsuro Yamashita", 1982, M.JOY | M.NEW],
    ["Mayonaka no Door (Stay With Me)", "Miki Matsubara", 1979, M.MISSING],
    ["Midnight Pretenders", "Tomoko Aran", 1983, M.LONGING | M.SLOW],
    ["Telephone Number", "Junko Ohashi", 1984, M.JOY],
    ["Dress Down", "Anri", 1984, M.JOY],
    ["Windy Summer", "Anri", 1983, M.JOY | M.NEW],
    ["Merry-Go-Round", "Piper", 1983, M.JOY],

    // ---- hindi / indian ----
    ["Tum Hi Ho", "Arijit Singh", 2013, M.DEVOTION | M.LONGING],
    ["Kabira", "Tochi Raina & Rekha Bhardwaj", 2013, M.ACHE | M.LONGING],
    ["Ae Dil Hai Mushkil", "Arijit Singh", 2016, M.ACHE | M.LONGING],
    ["Raabta", "Arijit Singh", 2012, M.DEVOTION],
    ["Tere Bina", "A. R. Rahman", 2007, M.LONGING | M.SLOW],
    ["Kun Faya Kun", "A. R. Rahman", 2011, M.DEVOTION],
    ["Jiya Jale", "Lata Mangeshkar", 1998, M.JOY | M.SLOW],
    ["Chaiyya Chaiyya", "Sukhwinder Singh & Sapna Awasthi", 1998, M.JOY],
    ["Pehla Nasha", "Udit Narayan & Sadhana Sargam", 1992, M.NEW],
    ["Tujhe Dekha To", "Lata Mangeshkar & Kumar Sanu", 1995, M.DEVOTION | M.NEW],
    ["Lag Jaa Gale", "Lata Mangeshkar", 1964, M.LONGING | M.SLOW],
    ["Ajeeb Dastan Hai Yeh", "Lata Mangeshkar", 1960, M.ACHE],
    ["Abhi Na Jao Chhod Kar", "Mohammed Rafi & Asha Bhosle", 1961, M.LONGING],
    ["Kya Hua Tera Vaada", "Mohammed Rafi", 1977, M.SORRY | M.ACHE],
    ["Channa Mereya", "Arijit Singh", 2016, M.ACHE | M.SORRY],
    ["Iktara", "Kavita Seth", 2010, M.NEW | M.LONGING],
    ["Agar Tum Saath Ho", "Alka Yagnik & Arijit Singh", 2015, M.ACHE | M.DEVOTION],

    // ---- modern pop / r&b ----
    ["Lover", "Taylor Swift", 2019, M.DEVOTION | M.SLOW],
    ["invisible string", "Taylor Swift", 2020, M.DEVOTION],
    ["exile", "Taylor Swift & Bon Iver", 2020, M.ACHE],
    ["Adore You", "Harry Styles", 2019, M.DEVOTION | M.JOY],
    ["Falling", "Harry Styles", 2019, M.SORRY | M.ACHE],
    ["Best Part", "Daniel Caesar & H.E.R.", 2017, M.DEVOTION | M.SLOW],
    ["Get You", "Daniel Caesar & Kali Uchis", 2016, M.DEVOTION],
    ["Pink + White", "Frank Ocean", 2016, M.JOY | M.LONGING],
    ["Self Control", "Frank Ocean", 2016, M.ACHE | M.LONGING],
    ["Thinkin Bout You", "Frank Ocean", 2012, M.LONGING],
    ["電話", "Cigarettes After Sex", 2017, M.SLOW],
    ["Apocalypse", "Cigarettes After Sex", 2017, M.SLOW | M.LONGING],
    ["Sweet", "Cigarettes After Sex", 2017, M.SLOW],
    ["Motion Sickness", "Phoebe Bridgers", 2017, M.ACHE],
    ["Scott Street", "Phoebe Bridgers", 2017, M.MISSING | M.ACHE],
    ["Vampire Empire", "Big Thief", 2023, M.LONGING],
    ["Paul", "Big Thief", 2016, M.ACHE],
    ["Simulation Swarm", "Big Thief", 2022, M.DEVOTION],
    ["Nightswimming", "R.E.M.", 1992, M.LONGING],
    ["At Your Best (You Are Love)", "Aaliyah", 1994, M.DEVOTION],
    ["Untitled (How Does It Feel)", "D'Angelo", 2000, M.SLOW],
    ["Cranes in the Sky", "Solange", 2016, M.ACHE],
    ["Location", "Khalid", 2016, M.NEW],
    ["Nothing", "Bruno Major", 2017, M.SLOW | M.DEVOTION],
    ["Easily", "Bruno Major", 2017, M.SLOW],
    ["Talking to the Moon", "Bruno Mars", 2010, M.MISSING],
    ["All I Want", "Kodaline", 2013, M.MISSING | M.ACHE],
    ["Say You Won't Let Go", "James Arthur", 2016, M.DEVOTION],
    ["Like Real People Do", "Hozier", 2014, M.NEW | M.SLOW],
    ["Cherry Wine", "Hozier", 2014, M.SLOW],
    ["Work Song", "Hozier", 2014, M.DEVOTION],
    ["Chamber of Reflection", "Mac DeMarco", 2014, M.MISSING],
    ["Let My Baby Stay", "Mac DeMarco", 2014, M.DEVOTION],
    ["Heart to Heart", "Mac DeMarco", 2019, M.SLOW],
    ["Sunsetz", "Cigarettes After Sex", 2017, M.LONGING],
    ["Somewhere Only We Know", "Keane", 2004, M.LONGING],
    ["Video Games", "Lana Del Rey", 2011, M.DEVOTION | M.ACHE],
    ["Love Song", "Lana Del Rey", 2019, M.SLOW | M.DEVOTION],
    ["Dandelions", "Ruth B.", 2017, M.NEW],
    ["The Night We Met", "Lord Huron", 2015, M.ACHE | M.MISSING],
    ["Sleep on the Floor", "The Lumineers", 2016, M.NEW | M.JOY],
    ["From Eden", "Hozier", 2014, M.LONGING],
    ["I Wanna Be Yours", "Arctic Monkeys", 2013, M.DEVOTION | M.SLOW],
    ["505", "Arctic Monkeys", 2007, M.MISSING | M.LONGING],
    ["Do I Wanna Know?", "Arctic Monkeys", 2013, M.LONGING],
    ["Slow Dancing in the Dark", "Joji", 2018, M.ACHE],
    ["Glimpse of Us", "Joji", 2022, M.ACHE | M.MISSING],
    ["August", "Taylor Swift", 2020, M.LONGING | M.ACHE],
    ["Blue", "Joni Mitchell", 1971, M.ACHE],
    ["A Case of You", "Joni Mitchell", 1971, M.DEVOTION | M.ACHE],
    ["River", "Joni Mitchell", 1971, M.SORRY | M.ACHE],
    ["Both Sides Now", "Joni Mitchell", 1969, M.ACHE],
    ["These Arms of Mine", "Otis Redding", 1962, M.LONGING],
    ["That's How Strong My Love Is", "Otis Redding", 1965, M.DEVOTION],
    ["I've Been Loving You Too Long", "Otis Redding", 1965, M.LONGING | M.DEVOTION],
  ];

  /* normalise once at load for fast, accent-insensitive matching */
  const norm = (s) =>
    s.toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const CATALOG = T.map(([title, artist, year, moods], i) => ({
    id: `cat-${i}`,
    title,
    artist,
    year,
    moods,
    provider: "catalog",
    _t: norm(title),
    _a: norm(artist),
  }));

  window.CATALOG = CATALOG;
  window.MOODS = MOODS;
  window.MOOD_BITS = M;
  window.normalizeQuery = norm;
})();
