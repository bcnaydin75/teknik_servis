import bcrypt from "bcryptjs";

const password = process.argv[2] ?? "Bcnaydin75!";
const hash =
  process.argv[3] ??
  "$2b$10$8d0T8UENFHOyd3xDictI2O.sdnaegKssdqSrHgPjgBn5b2OHZr7xi";

const fresh = await bcrypt.hash(password, 10);
console.log("fresh_hash:", fresh);
console.log("fresh_verify:", await bcrypt.compare(password, fresh));
console.log("stored_verify:", await bcrypt.compare(password, hash));
