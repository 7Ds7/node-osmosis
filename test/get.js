var osmosis = require('../index'),
    server  = require('./server'),
    URL     = require('url'),
    fs      = require('fs'),
    url     = server.host + ':' + server.port;


module.exports.function_url = function (assert) {
    osmosis.get(url)
    .then(function (context, data, next) {
        data.name = 'test';
        next(context, data);
    })
    .get(function (context, data) {
        return data.name + '-' + context.querySelector('p').innerText;
    })
    .then(function (context) {
        assert.ok(context.get('p').text().indexOf('success') !== -1);
    })
    .done(function () {
        assert.done();
    });
};

module.exports.redirect = function (assert) {
    var calledThen = false,
        logged = false;

    osmosis.get(url + '/?redirect=true')
    .then(function (context) {
        calledThen = true;
        assert.ok(context.request.headers.referer.length > 0);
        assert.equal(context.get('div').text(),
                     context.location.pathname);
        assert.ok(context.get('div').text().indexOf('redirect') !== -1);
    })
    .log(function (msg) {
        if (msg.indexOf('[redirect]') > -1) {
            logged = true;
        }
    })
    .done(function () {
        assert.ok(calledThen);
        assert.ok(logged);
        assert.done();
    });
};

module.exports.error_404 = function (assert) {
    var tries = 5, tried = 0;

    osmosis.get(url + '/404')
    .config('ignore_http_errors', true)
    .config('tries', tries)
    .error(function (msg) {
        if (msg.indexOf('404') > -1) {
            tried++;
        }
    })
    .done(function () {
        assert.strictEqual(tries, tried);
        assert.done();
    });
};

module.exports.error_redirect = function (assert) {
    var max = 4, logged = 0, errored = 0;

    osmosis.get(url + '/error-redirect')
    .config('follow', max)
    .config('tries', 1)
    .log(function (msg) {
        if (msg.indexOf('redirect') > -1) {
            logged++;
        }
    })
    .error(function (msg) {
        if (msg.indexOf('Max redirects') > -1) {
            errored++;
        }
    })
    .done(function () {
        assert.strictEqual(logged, max);
        assert.strictEqual(errored, 1);
        assert.done();
    });
};

module.exports.error_parse = function (assert) {
    var tries = 4;

    osmosis.get(url + '/error-parse')
    .config('tries', tries)
    .error(function (msg) {
        if (msg.indexOf('empty') > -1) {
            tries--;
        }
    })
    .done(function () {
        assert.strictEqual(tries, 0);
        assert.done();
    });
};


server('/', function (url, req, res) {
    if (url.query.redirect !== undefined) {
        res.writeHead(301, { Location: '/redirect' });
        res.end();
        return;
    }

    res.write('<p>test</p><div>' + JSON.stringify(req.query) + '</div>');
    res.end();
});

server('/404', function (url, req, res) {
    res.writeHead(404);
    res.end();
});

server('/error-redirect', function (url, req, res) {
    res.writeHead(301, { Location: '/error-redirect' });
    res.end();
});

server('/error-parse', function (url, req, res) {
    res.writeHead(200);
    res.end();
});


server('/redirect', function (url, req, res) {
    res.write('<div>/redirect</div>');
    res.end();
});

server('/test-test', function (url, req, res) {
    res.write('<p>success</p>');
    res.end();
});