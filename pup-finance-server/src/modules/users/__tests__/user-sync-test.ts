import request from 'supertest';
import app from '../../../app';
import prisma from '../../../config/prisma';

// Before any test run, ensure the test database is migrated and clean.
beforeAll(async () => {
    // script to reset the db.
    // ensure it's clean before each test.
})

// After all tests are finished, disconnect from Prisma.
afterAll(async () => {
    await prisma.$disconnect();
})

// Before each test, clean the user table to ensure test isolation.
beforeEach(async () => {
    await prisma.user.deleteMany({});
});

describe('POST /api/users/sync', () => {
    const syncEndpoint = 'api/users/sync';
    const actionSecret = process.env.API_SERVICE_TOKEN;

    it('should FAIL with 401 Unauthorized if the action secret is missing', async () => {
        await request(app)
            .post(syncEndpoint)
            .send({})
            .expect(401);
    });

    it('should FAIL with 401 Unauthorized if the action secret is incorrect', async () => {
        await request(app)
            .post(syncEndpoint)
            .set('Authorization', 'Bearer incorrect-secret')
            .send({})
            .expect(401);
    });

    it('should FAIL with 400 Bad Request if the payload is invalid', async () => {
        await request(app)
            .post(syncEndpoint)
            .set('Authorization', `Bearer ${actionSecret}`)
            .send({ email: 'not-an-email' }) // Missing auth0Id, invalid email test.
            .expect(400);
    });

    it('should CREATE a new user with a generated  username on first login', async () => {
        const fakeAuth0Payload = {
            auth0Id: `auth0|${Date.now()}`, //Unique ID for the test (yes, the date is for that)
            email: 'test.newuser@example.com',
            givenName: 'Test',
            familyName: 'Newuser',
            profilePictureUrl: 'https://example.com/profile.jpg',
        };

        const response = await request(app)
            .post(syncEndpoint)
            .set('Authorization', `Bearer ${actionSecret}`)
            .send(fakeAuth0Payload)
            .expect(200)

        // Verify the reponse from the API
        expect(response.body.message).toBe('User synced successfully');
        expect(response.body.userId).toBeDefined();

        // Verify the user was actually created in the database
        const dbUser = await prisma.user.findUnique({
            where: { auth0Id: fakeAuth0Payload.auth0Id },
        });

        expect(dbUser).not.toBeNull();
        expect(dbUser?.email).toBe(fakeAuth0Payload.email);
        expect(dbUser?.givenName).toBe(fakeAuth0Payload.givenName);
        expect(dbUser?.username).toContain('test_newuser_'); // Checks for the generated username part
    });

    it('should UPDATE an existing user (lastLogin) on a subsequent login', async () => {
        // First we create a user to simulate a previous login
        const existingUser = await prisma.user.create({
            data: {
                auth0Id: 'auth0|existing-user-123',
                email: 'existing.user@example.com',
                username: 'existing.user_abc123',
                lastLogin: new Date('2025-01-01T12:00:00.000Z'),
            },
        })

        const fakeAuth0Payload = {
            auth0Id: 'auth0|existing-user-123',
            email: 'existing.user@example.com',
            givenName: 'Test',
            familyName: 'Existing',
            profilePictureUrl: 'https://example.com/new-profile',
        };

        // Then simulate the second login
        await request(app)
            .post(syncEndpoint)
            .set('Authorization', `Bearer ${actionSecret}`)
            .send(fakeAuth0Payload)
            .expect(200);

        // Finally, verify the user was updated, NOT DUPLICATED (by the grace of God)
        const count = await prisma.user.count();
        expect(count).toBe(1);

        const dbUser = await prisma.user.findUnique({
            where: { auth0Id: fakeAuth0Payload.auth0Id },
        });

        expect(dbUser?.familyName).toBe('Existing'); // Check if name was updated
        expect(dbUser!.lastLogin!.getTime()).toBeGreaterThan(existingUser!.lastLogin!.getTime());

    });

})