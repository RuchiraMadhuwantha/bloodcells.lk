// The database assigns batch_id globally, including collections and received transfers.
// Deriving the public code from that key keeps it unique without random-code collisions.
const batchCode=id=>Number.isSafeInteger(Number(id))&&Number(id)>0?'B-'+String(Number(id)).padStart(4,'0'):null;
module.exports={batchCode};
