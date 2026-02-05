const { MongoMemoryServer } = require("mongodb-memory-server");

const download = async () => {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const mongodb = await MongoMemoryServer.create();
            await mongodb.stop();
            break;
        } catch (err) {
            console.error(`Failed to download and start mongodb.`);
            console.error(err);

            if (i < maxRetries - 1) {
                console.log("Retrying...");
            }
        }
    }
}

download();