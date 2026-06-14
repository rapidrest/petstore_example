import encoding from 'k6/encoding';
import http from 'k6/http';
import { check } from 'k6';
import { createPet } from './create_pet';
import { createUser } from './create_user';
import { login, config as loginConfig } from './login';

export const options = {
  vus: 1,
};

export const config = {
  url: __ENV.url || 'http://localhost:3000'
};

export default function() {
  // Create admin account
  const admin = createUser(config.url, { name: "admin", password: "admin", roles: ["admin"] });

  // Login with admin account
  const adminToken = login(config.url, "admin", "admin");

  // Create snowball pet
  const pet = createPet(config.url, adminToken, {
    name: "snowball",
    category: { name: "bunny" },
    tags: ["cute","fluffy","smart","white"]
  });

  // Create default test users
  for (let i = 0; i < 101; i++) {
    createUser(config.url, {
        name: loginConfig.name + i
    })
  }
}
