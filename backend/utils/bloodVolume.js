// Unknown historical volume remains null; never infer millilitres from unit count.
const round = value => Math.round(Number(value) * 100) / 100;
const moveVolume = (batch, units, entered) => {
  units=Number(units);
  const total=batch.volume_ml==null?null:round(batch.volume_ml);
  const known = batch.volume_ml != null;
  const specified = entered != null && entered !== '';
  if (!known && !specified) return null;
  const volume = specified ? Number(entered) : units===Number(batch.quantity)?total:round(total * units / Number(batch.quantity));
  const fail = message => { throw Object.assign(new Error(message), {statusCode:409}); };
  if (!Number.isFinite(volume) || volume <= 0 || round(volume) !== volume) fail('Enter a positive volume with up to two decimal places.');
  if (known && (volume > total || (units === Number(batch.quantity) && volume !== total) || (units < Number(batch.quantity) && volume >= total))) fail('Volume must match the units moved and leave volume for remaining units.');
  return volume;
};
const deductVolume = async (c, batch, volume) => {
  if (batch.volume_ml != null && volume != null) await c.query('UPDATE stock_batches SET volume_ml=volume_ml-? WHERE batch_id=?',[volume,batch.batch_id]);
};
module.exports={round,moveVolume,deductVolume};
