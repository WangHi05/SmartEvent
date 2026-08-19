import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '10s', target: 20 },
        { duration: '10s', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '10s', target: 0 },
    ],

    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['avg<200'],
    },
};

export default function () {
    const url =
        'http://localhost:5013/api/Events?pageNumber=1&pageSize=10';

    const response = http.get(url);

    check(response, {
        'HTTP status is 200': (r) => r.status === 200,
        'Response has data': (r) => r.body && r.body.length > 0,
    });

    sleep(1);
}