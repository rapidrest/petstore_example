import http from 'k6/http';
import { check } from 'k6';
import { uuidv4 } from './uuid.ts';
import { login } from './login.ts';

export const options = {
  vus: 200,
  duration: '300s',
};

export const config = {
  url: __ENV.url || 'http://localhost:3000',
  admin_name: __ENV.admin_name || 'admin',
  admin_pass: __ENV.admin_pass || 'admin'
};

export function createPet(url: string, authToken: string, data?: any) {
  const headers = {
    'Content-Type': "application/json",
    'Authorization': `jwt ${authToken}`
  };
  const uid = uuidv4();
  let pet = {
    category: { name: "pet" },
    name: uid,
    photoUrls: [],
    tags: [],
    status: "available",
    ...data
  };
  const res = http.post(url + "/pet", JSON.stringify(pet), { headers });
  check(res, { "status is 2XX": (res) => res.status >= 200 && res.status < 300 });
  return res.body;
}

let authToken: string | undefined = undefined;

export default function() {
  // Retrieve the admin token only once and cache it
  if (!authToken) {
    authToken = login(config.url, config.admin_name, config.admin_pass);
    if (!authToken) {
      throw new Error("Failed to login to admin account.");
    }
  }

  createPet(config.url, authToken);
}
