const hana = require('@sap/hana-client');

const connParams = {
    serverNode: process.env.SAP_HANA_SERVER_NODE,
    uid: process.env.SAP_HANA_USER,
    pwd: process.env.SAP_HANA_PASSWORD,
    encrypt: 'true',
    sslValidateCertificate: 'false'
};




const conn = hana.createConnection();
function connect() {
    return new Promise((resolve, reject) => {
        conn.connect(connParams, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(conn);
            }
        });
    });
}

module.exports = {
    connect,
    conn
};

// connect().then((c) => {
//     console.log("Connected to SAP HANA database successfully.");
//     console.log("Connection object:", c);
// }).catch(err => {
//     console.error("Failed to connect to SAP HANA database:", err);
// });
// // Example queries after successful connection
// connect().then(async (conn) => {
//     try {
//         // Query all users
//         conn.exec('SELECT * FROM Users', (err, rows) => {
//             if (err) {
//                 console.error('Error fetching users:', err);
//             } else {
//                 console.log('All users:', rows);
//             }
//         });



//         // Insert a new user
//         conn.prepare('INSERT INTO Users (USERNAME, AGE) VALUES (?, ?)', (err, statement) => {
//             if (err) {
//                 console.error('Error preparing insert:', err);
//             } else {
//                 statement.exec(['Alice', 30], (err) => {
//                     if (err) {
//                         console.error('Error inserting user:', err);
//                     } else {
//                         console.log('Inserted user Alice');
//                     }
//                     statement.drop();
//                 });
//             }
//         });
//     } finally {
//         // Close the connection after a short delay to allow async queries to finish
//         setTimeout(() => conn.disconnect(), 1000);
//     }
// }).catch(err => {
//     console.error("Failed to connect to SAP HANA database:", err);
// });