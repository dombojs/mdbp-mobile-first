
var CleanCSS = require('clean-css');
var autoprefixer = require('autoprefixer');
var splitsuit = require('splitsuit');
var uglify = require('uglify-js');
var crypto = require('crypto');
var lf = require('os').EOL;

var prefixPolicy = ['> 1%', 'last 2 versions', 'Firefox ESR', 'Opera 12.1'];
var breakpoints = [,
    '(min-width: 768px) and (max-width: 991px)',
    '(min-width: 992px) and (max-width: 1199px)',
    '(min-width: 1200px)'
];
var ieBreakpoint = 2;
var reportGzip = true;

var assetPrefix = {
    css: '../../style/',
    js: '../../script/',
    image: '../../graphic/',
    font: '../../fonts/'
};

var boot = 'dombojs/boot';
var ns = 'dombojs/ui';
var pseudos = /:before|:after|:hover|:active|:focus|:?:-moz[-a-z]+/g;

mdbp = {

    paths: {
        apps: 'app',
        markup: '**/*.mdbp.html',
        components: 'components',
        bundles: 'bundles',
        globals: 'globals',
        commit: 'commit',
        assets: {
            css: 'style',
            js: 'script',
            image: 'graphic',
            font: 'fonts',
            include: 'includes'
        }
    },

    copyFiles: true,

    markupDriven: function(cmp) {
        return (
            ~cmp.repo.indexOf('suitcss') && cmp.name !== 'base'
        ) || (
            cmp.keywords && ~cmp.keywords.indexOf('mdbp')
        );
    },

    cssForScan: function(css) {
        return css.replace(pseudos, '');
    },

    plugin: function(fn) {
        return ns + '-' + fn;
    },

    bundle: function(app) {
        var json = {
            name: app,
            repo: 'bundle/' + app,
            scripts: ['index.js'],
            paths: ['../../components'],
            dependencies: {}
        };
        json.dependencies[boot] = '*';
        return json;
    },

    css: function(css, save, log) {

        css = new CleanCSS().minify(css);
        css = splitsuit(css, breakpoints, ieBreakpoint);

        if (css.ie) {
            log.info('saving ' + save('dev-ie', refs(css.ie), true));
            log.info('saving ' + save('build-ie', refs(css.ie, assetPrefix)));
        }

        if (css.responsive) {
            css = autoprefixer(prefixPolicy).process(css.responsive).css;
            log.info('saving ' + save('dev', refs(css), true));
            log.info('saving ' + save('build', refs(css, assetPrefix)));
        }

    },

    js: function(js, save, log) {
        var orig = js.length;
        log.info('saving ' + save('dev', js, true));
        js = uglify.minify(js, {fromString: true}).code;
        log.info('saving ' + save('build', js));
        log.info('src:  ' + String(orig) + ' bytes');
        log.info('min:  ' + String(js.length) + ' bytes');
        if (reportGzip) log.info('gzip: ' + String(require('zlib-browserify').gzipSync(js)).length + ' bytes');
    },

    commit: function(bundle, css, js, save) {
        if (css.length) save('head.html', head(bundle, css[0].url, css[1].url));
        if (js.length) save('body.html', body(bundle, js[0].url, bundle));
    },

    hash: function(content) {
        var hash = crypto.createHash('md5');
        hash.update(content);
        return hash.digest('hex').slice(0, 8);
    }

};

function refs(content, prefix) {
    if (!prefix) prefix = {css: '', js: '', image: '', font: ''};
    Object.keys(mdbp.versions).forEach(function(src) {
        var r = new RegExp('\\b'+src+'\\b', 'g'),
            asset = mdbp.versions[src];
        content = content.replace(r, prefix[asset.type] + asset.url);
    });
    return content;
}

function head(bundle, ie, responsive) {
return [
 '<!--[if lte IE 8]>',
 '    <link rel="stylesheet" href="'+assetPrefix.css+bundle+'/'+ie+'">',
 '<![endif]-->',
 '<!--[if gt IE 8]><!-->',
 '    <link rel="stylesheet" href="'+assetPrefix.css+bundle+'/'+responsive+'">',
 '<!--<![endif]-->'
].join(lf);
}

function body(bundle, js) {
return '<script src="'+assetPrefix.js+bundle+'/'+js+'"></script><script>require("'+bundle+'")</script>';
}

module.exports = mdbp;
