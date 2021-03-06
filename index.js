
var prefixPolicy = ['> 1%', 'last 2 versions', 'Firefox ESR', 'Opera 12.1'];

var breakpoints = [,
    '(min-width: 768px) and (max-width: 991px)',
    '(min-width: 992px) and (max-width: 1199px)',
    '(min-width: 1200px)'
];
var ieBreakpoint = 2;

var copyFiles = true;





var pseudos = /:before|:after|:hover|:active|:focus|:?:-moz[-a-z]+/g;


var rework = require('rework');
var splitsuit = require('rework-splitsuit');
var opacity = require('rework-mixin-opacity');
var remFallback = require('rework-rem-fallback');
var autoprefixer = require('autoprefixer');
var CleanCSS = require('clean-css');
var uglify = require('uglify-js');
var crypto = require('crypto');
var gzip = require('zlib-browserify').gzipSync;
var path = require('path');
var lf = require('os').EOL;

mdbp = {

    boot: 'dombojs/boot',
    ns: 'dombojs/ui',

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

    assetPrefix: {
        css: '../../style/',
        js: '../../script/',
        image: '../../graphic/',
        font: '../../fonts/'
    },

    copyFiles: copyFiles,

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
        return mdbp.ns + '-' + fn;
    },

    bundle: function(app) {

        var json = {
            name: app,
            repo: 'bundle/' + app,
            scripts: ['index.js'],
            paths: ['../../components'],
            dependencies: {},
            globals: [
                "array-shim.js",
                "json2.js"
            ]
        };

        json.dependencies[mdbp.boot] = '*';

        return json;

    },

    alias: function(repo) {
        var ns = mdbp.ns;
        if (~repo.indexOf(ns)) return [
            ns.replace('/','-')+'/index.js',
            repo.replace('/','-')+'/deps/'+path.basename(ns)+'/index.js'
        ];
    },

    css: function(css, save, log) {

        var clean = new CleanCSS();

        css = rework(css).use(splitsuit(breakpoints, ieBreakpoint));

        var ie = css.ie
            .use(remFallback())
            .use(rework.mixin({opacity: opacity}))
            .toString();

        if (ie) {
            log.info('saving ' + save('dev-ie', refs(ie), true));
            log.info('saving ' + save('build-ie', refs(clean.minify(ie), mdbp.assetPrefix)));
        }

        css = css.responsive.toString();
        css = autoprefixer(prefixPolicy).process(css).css;

        if (css) {
            log.info('saving ' + save('dev', refs(css), true));
            log.info('saving ' + save('build', refs(clean.minify(css), mdbp.assetPrefix)));
        }

    },

    js: function(js, save, log) {

        log.info('saving ' + save('dev', js, true));


        js = uglify.minify(js, {fromString: true}).code;

        log.info('saving ' + save('build', js));





    },

    commit: function(bundle, css, js, save) {

        save('head.html', css.length ? head(bundle, css[0].url, css[1].url) : '');
        save('body.html', js.length ? body(bundle, js[0].url, bundle) : '');

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

    var p = mdbp.assetPrefix;

    return [
     '<!--[if lte IE 8]>',
     '    <link rel="stylesheet" href="'+p.css+bundle+'/'+ie+'">',
     '<![endif]-->',
     '<!--[if gt IE 8]><!-->',
     '    <link rel="stylesheet" href="'+p.css+bundle+'/'+responsive+'">',
     '<!--<![endif]-->'
    ].join(lf);

}

function body(bundle, js) {

    var p = mdbp.assetPrefix;

    return '<script src="'+p.js+bundle+'/'+js+'"></script><script>require("'+bundle+'")</script>';

}

module.exports = mdbp;
