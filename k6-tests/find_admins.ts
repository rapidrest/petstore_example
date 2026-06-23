import http from 'k6/http';
import { check } from 'k6';
import { login } from './login';

export const options = {
  vus: 200,
  duration: '60s'
};

export const config = {
  url: __ENV.url || 'http://localhost:3000',
  admin_name: __ENV.admin_name || 'admin',
  admin_pass: __ENV.admin_pass || 'admin',
};

export function findUsers(url: string) {
  const headers = {
    'Authorization': `jwt ${authToken}`
  };
  const res = http.get(url + "/user?roles=admin", { headers });
  check(res, { "status is 200": (res) => res.status === 200 });
  check(res, { "res.body is defined": (res) => res.body !== undefined });
  if (res && res.body) {
    return JSON.parse(res.body.toString());
  } else {
    throw new Error("Failed to retrieve pets with role: admin");
  }
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
  
  findUsers(config.url);
}
