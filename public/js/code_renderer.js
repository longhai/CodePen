var CodeRenderer = (function() {

    var CodeRenderer = {
        
        // reference versions of data
        refHTML     : '',
        refCSS      : '',
        refJS       : '',
        
        // reference pre processors
        refHTMLPP   : '',
        refCSSPP    : '',
        refJSPP     : '',
        
        // Cached result of content
        postProcessedHTML  : '',
        postProcessedCSS   : '',
        postProcessedJS    : '',
        
        errorHTML   : '',
        
        init: function() {
            this.compileContent(true);
        },
        
        // Main entry point to this module. Renders content to iframe.
        compileContent: function(forceCompile) {
            if(forceCompile || this.compileInRealTime()) {
                var content = CodeRenderer.getIFrameContent();
                CodeRenderer.writeContentToIFrame(content);
                CodeRenderer.executeIFrameJS();
            }
        },
        
        // Allows the editor to determine if it can show results in realtime
        compileInRealTime: function() {
            // Determine if we have a cached result for any of the content types
            // (html, css and js) and it's doesn't need a pre processor
            if( ( this.useCache('html') == false && TBData.htmlPreProcessor != 'none') ||
                ( this.useCache('css')  == false && TBData.cssPreProcessor  != 'none') ||
                ( this.useCache('js')   == false && TBData.jsPreProcessor   != 'none') ) {
                // If we've come here, it's because we don't have a cached result
                // and the content needs to be sent to the server for processing
                return false;
            }
            else {
                // We have everything we need to render the content in real time
                // No server needed. Update iframe.
                return true;
            }
        },

        writeContentToIFrame: function(content) {
            var doc = $('#result').contents()[0];
            doc.open();
            doc.write(content);
            doc.close();
        },
        
        executeIFrameJS: function() {
            // Only execute if no errors exist
            // the iframe seems to cache the JS, even though we
            // over write the content of the iframe. It will hold 
            // onto the javascript and execute it. If it has nothing
            // it seems to hold onto the cache as well.
            if(!this.errorHTML && this.postProcessedJS) {
                var contentWindow = $('#result')[0].contentWindow;

                if(contentWindow.__run) {
                    contentWindow.__run();
                }
            }
        },

        getIFrameContent: function() {
            this.processContent();
            
            if(CodeRenderer.errorHTML) {
               // errors exist, show those as result
               return CodeRenderer.errorHTML;
            }
            else {
               return this.getIFrameHTML();
            }
        },
        
        getIFrameHTML: function() {
            var values = {
                  TITLE      : "Code Pen",
                  CSS        : this.postProcessedCSS,
                  HTML       : this.postProcessedHTML,
                  JS         : this.getJS(),
                  JSLIB      : this.getJSLibrary(),
                  PREFIX     : this.getPrefixFree(),
                  CSS_STARTER: this.getCSSStarter()
            };

            return tmpl(this.getTPL('result'), values);
        },
        
        getJS: function() {
            if(this.postProcessedJS) {
                var js = 'function __run() { ';
                js += this.postProcessedJS + ' }';
                
                return js;
            }
            else {
                return '';
            }
        },
        
        getJSLibrary: function() {
            if(TBData.jsLibrary) {
                var jsLibs = {
                    'jquery-latest': 'http://code.jquery.com/jquery-latest.js',
                    'mootools'     : '//ajax.googleapis.com/ajax/libs/mootools/1.4.1/mootools-yui-compressed.js',
                    'prototype'    : '//ajax.googleapis.com/ajax/libs/prototype/1.7.0.0/prototype.js'
                }
                return '<script src="' + jsLibs[TBData.jsLibrary] + '"></script>';
            }
            else {
                return '';
            }
        },
        
        getPrefixFree: function() {
            if(TBData.cssPreFixFree) {
                return '<script src="/box-libs/prefixfree.min.js"></script>';
            }
            else {
                return '';
            }
        },
        
        getCSSStarter: function() {
            if(TBData.cssStarter == 'normalize') {
                href = '/stylesheets/css/normalize.css';
                return '<link rel="stylesheet" href="'+ href + '">';
            }
            else if(TBData.cssStarter == 'reset') {
                href = '/stylesheets/css/reset.css';
                return '<link rel="stylesheet" href="'+ href + '">';
            }
            else {
                return '';
            }
        },
        
        // Render content, serverside or client, then update cached content
        // All content saved to postProcessed(HTML|CSS|JS)
        processContent: function() {
            params = { };
            
            if(!this.useCache('html')) {
                if(this.needsPreProcessing(TBData.htmlPreProcessor)) {
                    params['html'] = TBData.html;
                    params['htmlPreProcessor'] = TBData.htmlPreProcessor;
                }
                else {
                    // Since the html is simply html, it is post processed
                    this.postProcessedHTML = TBData.html;
                }
            }
            
            if(!this.useCache('css')) {
                if(this.needsPreProcessing(TBData.cssPreProcessor)) {
                    params['css'] = TBData.css;
                    params['cssPreProcessor'] = TBData.cssPreProcessor;
                }
                else {
                    // Since the css is simply css, it is post processed
                    this.postProcessedCSS = TBData.css;
                }
            }
            
            if(!this.useCache('js')) {
                if(this.needsPreProcessing(TBData.jsPreProcessor)) {
                    params['js'] = TBData.js;
                    params['jsPreProcessor'] = TBData.jsPreProcessor;
                }
                else {
                    // Since the js is simply js, it is post processed
                    this.postProcessedJS = TBData.js;
                }
            }
            
            if(params['html'] || params['css'] || params['js']) {
                CodeRenderer.errorHTML = '';
                this.sendContentToServer(params);
            }
            
            this.storeRefContent();
        },
        
        storeRefContent: function() {
            this.refHTML   = TBData.html;
            this.refHTMLPP = TBData.htmlPreProcessor;
            
            this.refCSS    = TBData.css;
            this.refCSSPP  = TBData.cssPreProcessor;
            
            this.refJS     = TBData.js;
            this.refJSPP   = TBData.jsPreProcessor;
        },
        
        // Send content to server for processing
        sendContentToServer: function(params) {
            $.ajax({
                  url: '/process/',
                  type: 'POST',
                  async: false,
                  data: this.getDataValues(params),
                  success: function( result ) {
                      obj = $.parseJSON(result);
                      
                      if(obj['error_html']) {
                          CodeRenderer.errorHTML = obj['error_html'];
                      }
                      else {
                          // keys are html, css or js
                          // Saved results to postProcssed(HTML|CSS|JS)
                          
                          for(var key in obj) {
                              var upKey = key.toUpperCase();
                              
                              CodeRenderer['postProcessed' + upKey] = obj[key];
                          }
                      }
                  }
            });
        },
        
        getDataValues: function(params) {
            var dataValues = '';
            var count = 0;
            
            for(var key in params) {
                if(dataValues != '') dataValues += '&';
                dataValues += key + '=' + encodeURIComponent(params[key]);
            }
            
            return dataValues;
        },
        
        // determine if what's in the editor is the same 
        // as what's saved in reference (unprocessed content) cache. 
        // if so use cached version of content, e.g. postProcessedHTML, postProcessedCSS
        useCache: function(type) {
            // if any errors exist, don't use cache
            if(CodeRenderer.errorHTML) return false;
            
            if(type == 'html') {
                if( this.refHTML   == TBData.html && 
                    this.refHTMLPP == TBData.htmlPreProcessor) {
                    return true;
                }
                else {
                    this.postProcessedHTML = '';
                    return false;
                }
            }
            else if(type == 'css') {
                if( this.refCSS   == TBData.css && 
                    this.refCSSPP == TBData.cssPreProcessor) {
                    return true;
                }
                else {
                    this.postProcessedCSS = '';
                    return false;
                }
            }
            else {
                if( this.refJS   == TBData.js && 
                    this.refJSPP == TBData.jsPreProcessor) {
                    return true
                }
                else {
                    this.postProcessedJS = '';
                    return false;
                }
            }
        },
        
        // Determine if the content needs to be processed on the server
        // All preprocessors are rendered server side
        needsPreProcessing: function(preProcessor) {
            return (preProcessor && preProcessor != 'none');
        },

        getTPL: function(name) {
            return __templates[name];
        },
        
        createGist: function() {
            var gistData = {
                'html': this.postProcessedHTML,
                'css' : this.postProcessedCSS,
                'js'  : this.postProcessedJS,
            }
            
            $.ajax({
                  url: '/gist/',
                  type: 'POST',
                  async: false,
                  data: this.getDataValues(gistData),
                  success: function( result ) {
                      obj = $.parseJSON(result);
                      
                      // console.log('response from github');
                      //                       console.log(obj);
                      
                      // once succssefull need to open new tab
                  }
            });
        }
    };

    return CodeRenderer;

})();