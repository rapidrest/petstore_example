import http from 'k6/http';
import { check } from 'k6';
import { getPet } from './get_pet.ts';
import { login } from './login.ts';
import { uuidv4 } from './uuid.ts';

export const options = {
  vus: 100,
  duration: '30s',
};

export const config = {
  url: __ENV.url || 'http://localhost:3000',
  name: __ENV.name || "test_user",
  password: __ENV.password || "password",
  petId: __ENV.petid || "snowball"
};

export function createOrder(url: string, token: string, petId: string, quantity: number) {
  const pet = getPet(url, petId);

  const headers = {
    'Content-Type': "application/json",
    'Authorization': `jwt ${token}`
  };
  const uid = uuidv4();
  let order = {
    petId: pet.uid,
    quantity
  };
  const res = http.post(url + "/store/order", JSON.stringify(order), { headers });
  check(res, { "status is 2XX": (res) => res.status >= 200 && res.status < 300 });
  check(res, { "res.body is defined": (res) => res.body !== undefined });
  if (res && res.body) {
    return JSON.parse(res.body.toString());
  } else {
    throw new Error("Failed to create order");
  }
}

export default function() {
  const token = login(config.url, config.name, config.password);
  createOrder(config.url, token, config.petId, 1);
}
