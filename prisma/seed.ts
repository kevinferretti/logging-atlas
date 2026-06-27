import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@atlas.app";
const DEMO_PASSWORD = "password";

// [countryId, entries[]] where each entry is [category, title, by, year, note].
// Lifted verbatim from the Atlas design export so the demo account opens populated.
type RawEntry = [string, string, string, number, string];
const SEED: Array<[string, RawEntry[]]> = [
  ["231", [
    ["recipe", "Doro Wat", "", 2019, "Berbere chicken, the long-simmer kind"],
    ["recipe", "Injera", "", 2019, "Teff sourdough — took three tries"],
    ["recipe", "Misir Wot", "", 2020, ""],
    ["book", "Cutting for Stone", "Abraham Verghese", 2019, ""],
    ["movie", "Difret", "", 2021, ""],
    ["music", "Mulatu of Ethiopia", "Mulatu Astatke", 2020, "Éthiopiques on repeat"],
    ["place", "Lalibela", "", 2019, "Rock-hewn churches at dawn"],
    ["place", "Simien Mountains", "", 2019, ""],
  ]],
  ["356", [
    ["recipe", "Masala Dosa", "", 2017, ""],
    ["recipe", "Rogan Josh", "", 2018, ""],
    ["recipe", "Chana Masala", "", 2017, ""],
    ["recipe", "Kheer", "", 2019, ""],
    ["book", "The God of Small Things", "Arundhati Roy", 2017, ""],
    ["book", "Midnight’s Children", "Salman Rushdie", 2018, ""],
    ["movie", "The Lunchbox", "", 2017, "Watched it twice in a week"],
    ["movie", "Pather Panchali", "Satyajit Ray", 2019, ""],
    ["music", "Three Ragas", "Ravi Shankar", 2018, ""],
    ["music", "Bombay", "A. R. Rahman", 2019, ""],
    ["place", "Varanasi", "", 2017, "The ghats at sunrise"],
  ]],
  ["124", [
    ["recipe", "Tourtière", "", 2016, ""],
    ["recipe", "Butter Tarts", "", 2017, ""],
    ["book", "The Handmaid’s Tale", "Margaret Atwood", 2016, ""],
    ["movie", "Stories We Tell", "Sarah Polley", 2018, ""],
    ["music", "Songs of Leonard Cohen", "Leonard Cohen", 2017, ""],
    ["place", "Lake Louise", "", 2016, "Banff in early June"],
    ["place", "Old Montréal", "", 2019, ""],
  ]],
  ["392", [
    ["recipe", "Okonomiyaki", "", 2015, "Osaka-style, lots of cabbage"],
    ["recipe", "Oyakodon", "", 2016, ""],
    ["recipe", "Miso-glazed Eggplant", "", 2017, ""],
    ["recipe", "Onigiri", "", 2018, ""],
    ["book", "Norwegian Wood", "Haruki Murakami", 2015, ""],
    ["book", "The Makioka Sisters", "Jun’ichirō Tanizaki", 2017, ""],
    ["book", "Kitchen", "Banana Yoshimoto", 2018, ""],
    ["movie", "Spirited Away", "Hayao Miyazaki", 2015, ""],
    ["movie", "Tokyo Story", "Yasujirō Ozu", 2016, ""],
    ["movie", "Tampopo", "", 2019, "A ramen western"],
    ["music", "async", "Ryuichi Sakamoto", 2017, ""],
    ["music", "Hosono House", "Haruomi Hosono", 2018, ""],
    ["place", "Fushimi Inari", "", 2015, "Ten thousand vermilion gates"],
    ["place", "Naoshima", "", 2019, "The art island"],
  ]],
  ["380", [
    ["recipe", "Cacio e Pepe", "", 2014, ""],
    ["recipe", "Ragù alla Bolognese", "", 2015, "Six hours, worth every minute"],
    ["recipe", "Risotto alla Milanese", "", 2016, ""],
    ["recipe", "Tiramisù", "", 2017, ""],
    ["book", "If on a winter’s night a traveler", "Italo Calvino", 2015, ""],
    ["book", "My Brilliant Friend", "Elena Ferrante", 2018, ""],
    ["movie", "La Dolce Vita", "Federico Fellini", 2014, ""],
    ["movie", "Cinema Paradiso", "", 2016, ""],
    ["music", "Le Onde", "Ludovico Einaudi", 2017, ""],
    ["place", "Cinque Terre", "", 2014, ""],
    ["place", "Roman Forum", "", 2015, ""],
    ["place", "Ortigia, Sicily", "", 2019, ""],
  ]],
  ["484", [
    ["recipe", "Mole Poblano", "", 2018, "Twenty-odd ingredients"],
    ["recipe", "Tacos al Pastor", "", 2018, ""],
    ["recipe", "Sopa de Lima", "", 2019, ""],
    ["book", "Pedro Páramo", "Juan Rulfo", 2019, ""],
    ["movie", "Roma", "Alfonso Cuarón", 2018, ""],
    ["music", "Re", "Café Tacvba", 2020, ""],
    ["place", "Oaxaca", "", 2018, "Día de Muertos"],
    ["place", "Teotihuacán", "", 2019, ""],
  ]],
  ["504", [
    ["recipe", "Chicken Tagine", "", 2020, "With olives & preserved lemon"],
    ["recipe", "Harira", "", 2020, ""],
    ["book", "The Sheltering Sky", "Paul Bowles", 2021, ""],
    ["music", "Colours", "Maâlem Mahmoud Guinia", 2021, "Gnawa trance"],
    ["place", "Fès el Bali", "", 2020, "The medina maze"],
    ["place", "Erg Chebbi", "", 2021, "Sahara dunes"],
  ]],
  ["250", [
    ["recipe", "Coq au Vin", "", 2013, ""],
    ["recipe", "Ratatouille", "", 2014, ""],
    ["recipe", "Tarte Tatin", "", 2015, ""],
    ["book", "The Stranger", "Albert Camus", 2013, ""],
    ["book", "Bonjour Tristesse", "Françoise Sagan", 2016, ""],
    ["movie", "Amélie", "", 2013, ""],
    ["movie", "The 400 Blows", "François Truffaut", 2015, ""],
    ["music", "Gymnopédies", "Erik Satie", 2017, ""],
    ["place", "Musée d’Orsay", "", 2013, ""],
    ["place", "Gordes, Provence", "", 2018, ""],
  ]],
  ["76", [
    ["recipe", "Feijoada", "", 2019, ""],
    ["recipe", "Pão de Queijo", "", 2019, ""],
    ["book", "The Hour of the Star", "Clarice Lispector", 2020, ""],
    ["movie", "City of God", "", 2019, ""],
    ["music", "Getz/Gilberto", "João Gilberto", 2020, ""],
    ["music", "Wave", "Antônio Carlos Jobim", 2021, ""],
    ["place", "Pelourinho, Salvador", "", 2019, ""],
  ]],
  ["704", [
    ["recipe", "Phở Bò", "", 2021, "Broth simmered overnight"],
    ["recipe", "Bánh Mì", "", 2021, ""],
    ["recipe", "Gỏi Cuốn", "", 2022, ""],
    ["book", "The Sympathizer", "Viet Thanh Nguyen", 2022, ""],
    ["movie", "The Scent of Green Papaya", "", 2022, ""],
    ["place", "Hội An", "", 2021, "Lanterns on the river"],
    ["place", "Hà Giang Loop", "", 2022, ""],
  ]],
  ["300", [
    ["recipe", "Moussaka", "", 2022, ""],
    ["recipe", "Avgolemono", "", 2022, ""],
    ["book", "Zorba the Greek", "Nikos Kazantzakis", 2022, ""],
    ["music", "Ektos Programmatos", "Eleftheria Arvanitaki", 2023, ""],
    ["place", "Oia, Santorini", "", 2022, ""],
  ]],
  ["604", [
    ["recipe", "Ceviche", "", 2023, "Leche de tigre, fresh lime"],
    ["recipe", "Lomo Saltado", "", 2023, ""],
    ["movie", "The Milk of Sorrow", "", 2023, ""],
    ["place", "Machu Picchu", "", 2023, "Up before dawn for the gate"],
  ]],
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: "Demo Traveler", passwordHash },
  });

  // Start the demo account from a clean slate so re-seeding is idempotent.
  await prisma.entry.deleteMany({ where: { userId: user.id } });

  const data = SEED.flatMap(([countryId, entries]) =>
    entries.map(([category, title, by, year, note]) => ({
      userId: user.id,
      countryId,
      category,
      title,
      by,
      year,
      note,
    })),
  );

  await prisma.entry.createMany({ data });

  console.log(
    `Seeded ${data.length} entries across ${SEED.length} countries for ${DEMO_EMAIL} (password: "${DEMO_PASSWORD}").`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
