import { Duffel } from '@duffel/api';

const duffel = new Duffel({
  token: process.env.DUFFEL_ACCESS_TOKEN!,
});

export default duffel;
