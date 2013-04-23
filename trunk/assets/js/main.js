// main closure
(function($) {
    /*
     * Notification object
     * 
     */
    $.notification={
        // Number of async requests to be made
        'count':0,
        // Total number of async requests completed
        'counter':0,
        /*
         * @method notifySyncEnd callback
         * @param {Boolean} prompt If to alert the user or not
         * @required {int} count
         * @required {int} counter
         */
        'notifiySyncEnd':function(prompt){
            prompt=prompt||0;
            if(this.count == this.counter){
                this.count = 0; 
                this.counter = 0;
                if($.debugLevel==1){
                    console.log("End Client Sync With Server");
                }
                if(prompt){
                    alert("End Client Sync With Server");
                }
                syncLog('End Client Sync With Server');
            }
        }
    };
    /*
     * Configuration
     */
    // 0 : switch off debugging.
    // 1 : switch on debugging.
    $.debugLevel=1;
    // records in a page
    $.pageSize=10;
    // how many pages buttons to show between Prev and Next buttons
    $.showPages=5;
    
    $.barcodeLength=5;

    $.recordSyncLimit=1000;
    $.syncStatus={};
    $.settingsField=["read_stockmove_starting_from","user_id","user_name", "password", "database", "application_server_url", "client_sync_freq_with_server", "offline_duration_server"];

    $.settings={};
    // not used
    $.interval = null;

    $.messageTpl = Handlebars.compile($('#message').html());

    // @to-do move to util
    // return true or false from typeof === undefined 
    $.defined = function(defined) {
        return defined != 'undefined';
    }

    // show error
    // Right now both form-view and list-view are using the same layout
    // @to-do move to modal dialog
    $.message = function(error) {
        $('.page').hide().filter('#form-view').show().html($.messageTpl(error));
    }

    // db layer abstraction
    $.db = {
        connection: null,
        connect: function(db, version, message, duration) {
            if ($.defined(typeof window.openDatabase)) {
                this.connection = window.openDatabase(db, version, message, duration);
                return true;
            } else {
                $.message({
                    'message': 'Your device dont support local storage'
                })
                return false;
            }
        },
        execute: function(sql, params, success, failure) {
            if ($.defined(typeof params)) {
                params = [];
            }
            success = success || function(tx, result, sql, params) {
            };
            failure = failure || function(tx, error, sql, params) {
                $.message({
                    'message': 'Your request could not be performed due to error: '+error.message+', SQL:'+sql
                });
            };
            if ($.debugLevel == 1) {
                console.log(sql);
            }
            if (this.connection != null) {
                this.connection.transaction(function(tx) {
                    tx.executeSql(sql, params, function(tx, result) {
                        if ($.debugLevel == 1) {
                            console.log('success');
                            console.log(result);
                        }
                        success(tx, result, sql, params);
                    }, function(tx, error) {
                        if ($.debugLevel == 1) {
                            console.log('error');
                            console.log(error);
                        }
                        failure(tx, error, sql, params);
                    });
                });
            } else {
                $.message({
                    'message': 'Your device dont support local storage'
                })

            }
        }
    };

    

    
    
    
    var syncLog=function(message){
        message=message||'';
        
    //$.db.execute("INSERT INTO sync_log(message,sync_on) VALUES(\""+message+"\",datetime())",[]);
    }
    
    // compile templates
    $.stockMoveListTpl=Handlebars.compile($('#stock-move-list').html());
    $.stockMoveFormTpl=Handlebars.compile($('#stock-move-form').html());
    $.settingsFormTpl=Handlebars.compile($('#settings-form').html());
    $.syncLogListTpl=Handlebars.compile($('#sync-log-list').html());
    $.syncStatusListTpl=Handlebars.compile($('#sync-status').html());
    
    
    $.processStatusList={};
    $.each(statusList || [],function(k,v){
        $.processStatusList[v['id']]=v['name'];
    });
    
    
    
    var settings=function(){
        
        $.each($.settingsField,function(k,v){
            if(typeof(localStorage[v]) != 'undefined'){
                $.settings[v]=localStorage[v];
            }else{
                $.settings[v]='';
            }
        });
        if(typeof($.settings['user_id']) != 'undefined'){
            $.settings['user_id']=parseInt($.settings['user_id']);
        }
        if(typeof($.settings['application_server_url']) != 'undefined' && $.settings['application_server_url'] !=''){
            $.setHash('showStockMoves');       
        }else{
            $.setHash('showSettingsForm');
        }
    }
    
    $.setHash=function(hash,callback){
        var hash1=location.hash.split('/')[0];
        if(hash.indexOf(hash1) == -1){
            location.hash=hash;
        }else{
            hash = hash.split('/')[0];
            callback = callback || $[hash]; 
            callback();
        }
    }
    
    var computePages=function(page,pageSize,totalRecords,callback,extendedSQL,viewName){
        var extendedSQL=extendedSQL||'';
        extendedSQL=encodeURIComponent(extendedSQL);
        var totalPages=Math.ceil((totalRecords/pageSize)); 
        var pages=[];
        var viewName=viewName||'';
        page=parseInt(page);
        if(page==1){
            pages.push({
                'label':'Prev',
                'class':'disabled',
                'number':'',
                'callback':''
            });
        }else{
            pages.push({
                'label':'Prev',
                'number':(page-1)
            });
        }
        
        var start=end=page;
        
        if(totalPages <= $.showPages){
            start=1;
            end=totalPages;
        }else{
            start=page;
            end=page+$.showPages-1;
            if(end > totalPages){
                start += (totalPages-end);
                end=totalPages;
            }
        }
        
        for(var i=start;i<=end;i++){
            pages.push({
                'label':i,
                'number':i,
                'class':(page==i?'active':'')
                
            });
        }
        if(totalPages>5){
            pages.push({
                'label':'of '+totalPages+' pages',
                'number':totalPages
            });
        }
        
        if( page==totalPages || totalPages==0){
            pages.push({
                'label':'Next',
                'class':'disabled',
                'number':'',
                'callback':''
            });
        }else{
            pages.push({
                'label':'Next',
                'number':(page+1)
            });
        }
        var length=pages.length;
        for(var i=0; i < length ;i++){
            if(typeof(pages[i]['callback']) =='undefined'){
                pages[i]['callback']=callback;
                pages[i]['extended_sql']=extendedSQL;
                pages[i]['view_name']=viewName;
            }
        }
        return {
            'pages':pages,
            'total_pages':totalPages
        };
    }
    $.showStockMoves = function(extendedSQL,params,page,viewName) {
        var fields=['id','product_id','product_uom','location_id','location_dest_id','state','prodlot_id','product_qty','name','date','date_expected'];
        var params = params || [];
        var extendedSQL = extendedSQL || "";
        var page=page||1;
        var pageSize=$.pageSize;
        var offset=((page-1) * pageSize);
        var viewName=viewName || "";
        if(extendedSQL ==""){
            extendedSQL=encodeURIComponent(JSON.stringify([["state","in",["assigned","confirmed","waiting"]],["picking_id.type","=","internal"]]));
            viewName="Ready Stock Moves";
        }
        
        
        if(extendedSQL !=""){
            extendedSQL=JSON.parse(decodeURIComponent(extendedSQL));
        }
        if(typeof extendedSQL !="object"){
            extendedSQL=[];
        }
        
        
        var filter=extendedSQL.slice(0);
        filter.unshift(["create_date",">",$.settings['read_stockmove_starting_from']]);
        var url=$.settings['application_server_url']+($.settings['application_server_url'].substring(-1) =='/'?'':'/');
        
        $.xmlrpc({
            url: url+'xmlrpc/object',
            methodName: 'execute',
            params: [$.settings['database'],$.settings['user_id'],$.settings['password'],"stock.move",'search',filter],
            success: function(response, status, jqXHR) {
                var recordIDS=[];
                $.each(response, function(k,v){
                    $.each(v,function(kk,vv){
                        recordIDS.push(parseInt(vv));
                    });
                });
                var totalRecords=recordIDS.length;
                recordIDS=recordIDS.slice(offset,offset+pageSize);
                $.xmlrpc({
                    url: url+'xmlrpc/object',
                    methodName: 'execute',
                    params: [$.settings['database'],$.settings['user_id'],$.settings['password'],'stock.move','read',recordIDS,fields],
                    success: function(response, status, jqXHR) {
                        var records = [];
                        $.each(response,function(k,v){
                            if(typeof(v) =='object'){
                                $.each(v,function(kk,vv){
                                    records.push($.mapStockMoveData(vv));    
                                });
                            }
                        });
                        var pagination=computePages(page,pageSize,totalRecords,'showStockMoves',JSON.stringify(extendedSQL),viewName);
                        $('.page').hide().filter('#list-view').show().html($.stockMoveListTpl({
                            'records': records,
                            'pages':pagination['pages'],
                            'total_pages':pagination['total_pages'],
                            'view_name':viewName,
                            'since':$.settings['read_stockmove_starting_from']
                        }));
                    },
                    error: function(jqXHR, status, error) {
                        msg='Reading stock.move failed with error ';
                        if ($.debugLevel == 1) {
                            msg +="\n\nServer Response:\n"+error.message
                        }    
                        alert(msg);
                                            
                    }
                });
            },
            error: function(jqXHR, status, error) {
                msg='Searching stock.move failed with error ';
                if ($.debugLevel == 1) {
                    msg +="\n\nServer Response:\n"+error.message
                }    
                alert(msg);
                                            
            }
        });
        
    }
    $.searchStockMoveByStatus=function(status,viewName){
        $.showStockMoves(encodeURIComponent(JSON.stringify([["state","=",status]])),[],1,viewName);
    }
    
    // handel search via search form
    $(document).on('submit', '.navbar-search', function(event) {
        var searchInput = $(this).find('#search-input').val();
        $.showStockMoves(encodeURIComponent(JSON.stringify([
            "|"
            ,["state","ilike",searchInput]
            ,["name","ilike",searchInput]
            ,["product_id.name","ilike",searchInput]
            ,["product_uom.name","ilike",searchInput]
            ,["location_id.complete_name","ilike",searchInput]
            ,["location_dest_id.complete_name","ilike",searchInput]
            ,["prodlot_id.name","ilike",searchInput]
            
            ])));
        
        /*
            
             
         */
        
        event.stopImmediatePropagation();
        event.stopPropagation();
        event.preventDefault();
        return false;
    });
    $.mapStockMoveData=function(vv){
        var data={};
        data['id']=vv['id'] || '';
        data['product_id']=vv['product_id'][0]  || '';
        data['product_name']=vv['product_id'][1]  || '';
        data['uom_id']=vv['product_uom'][0]  || '';
        data['uom_name']=vv['product_uom'][1]  || '';
        data['source_location_id']=vv['location_id'][0]  || '';
        data['source_location_name']=vv['location_id'][1]  || '';
        data['destination_location_id']=vv['location_dest_id'][0]  || '';
        data['destination_location_name']=vv['location_dest_id'][1]  || '';
        data['status_id']=vv['state']  || '';
        data['status_name']=$.processStatusList[vv['state']] || '';
        data['serial_number_id']=vv['prodlot_id'][0] || '';
        data['serial_number_name']=vv['prodlot_id'][1] || '';
        data['quantity']=vv['product_qty'] || '';
        data['name']=vv['name'] || '';
        data['date']=vv['date'] || '';
        data['scheduled_date']=vv['date_expected'] || '';
        data['editable']=true;
        if(data['status_id'] == 'done' || data['status_id'] == 'cancel' ){
            data['editable']=false;
        }
        
        return data;
    }
    
    $.editStockMove=function(id){
        var url=$.settings['application_server_url']+($.settings['application_server_url'].substring(-1) =='/'?'':'/');
        if(url !== false){
            var fields=['id','product_id','product_uom','location_id','location_dest_id','state','prodlot_id','product_qty','name','date','date_expected'];
            $.xmlrpc({
                url: url+'xmlrpc/object',
                methodName: 'execute',
                params: [$.settings['database'],$.settings['user_id'],$.settings['password'],'stock.move','read',[id],fields],
                success: function(response, status, jqXHR) {
                    response=response[0][0];
                    var form = $('.page').hide().filter('#form-view').show().html($.stockMoveFormTpl($.mapStockMoveData(response)));
                    initAutocomplete(form);
                }
            });
        }
        
    }
    
    
    // Sync client with server every xx seconds.
    $(window).on('hashchange', function() {
        var hash=$.trim(location.hash.substring(1)).split('/');
        if(typeof(hash[0]) != 'undefined' && hash[0] !="" && typeof($[hash[0]]) =='function'){
            var callback=hash.shift();
            $[callback].apply($,hash);
        }
    });
    
    // reset search form
    $(document).on('click', '#search-reset-button', function() {
        $('.page').hide();
        $(this).closest('form').find('#search-input').val("");
        $.setHash('showStockMoves');
    });
    // cancel stock move form. 
    $(document).on('click', '.cancel-stock-move', function() {
        $.setHash('showStockMoves');
    });
    
    
    

    // initialize auto complete
    var initAutocomplete = function(form) {
        form.find('.autocomplete')
        .typeahead({
            source: function(query, process) {
                var element=$(this.$element);
                if(typeof($.settings['application_server_url']) != undefined){
                    var url=$.settings['application_server_url']+($.settings['application_server_url'].substring(-1) =='/'?'':'/');
                    var userID=$.settings['user_id'] || 0;
                    var model = element.data('model');
                    var labelField="name";
                    var valueField="id";
                    if(element.data('label')){
                        labelField=element.data('label');
                    }
                    if(element.data('value')){
                        valueField=element.data('value');
                    }
                    
                    if(typeof(window[model]) !== undefined && typeof(window[model]) ==='object'){
                        var records = [];
                        $.each(window[model],function(kk,vv){
                            var group = {
                                id: vv[valueField],
                                name: vv[labelField],
                                toString: function() {
                                    return JSON.stringify(this);
                                },
                                toLowerCase: function() {
                                    return this.name.toLowerCase();
                                },
                                indexOf: function(string) {
                                    return String.prototype.indexOf.apply(this.name, arguments);
                                },
                                replace: function(string) {
                                    var value = '';
                                    value += this.name;
                                    if (typeof(this.level) != 'undefined') {
                                        value += ' <span class="pull-right muted">';
                                        value += this.level;
                                        value += '</span>';
                                    }
                                    return String.prototype.replace.apply('<div style="padding: 10px; font-size: 1.5em;">' + value + '</div>', arguments);
                                }
                            };
                            records.push(group);
                        });
                        process(records);
                    }else{
                        $.xmlrpc({
                            url: url+'xmlrpc/object',
                            methodName: 'execute',
                            params: [$.settings['database'],userID,$.settings['password'],model,'search',[[labelField,"ilike",query]]],
                            success: function(response, status, jqXHR) {
                                var recordIDS=[];
                                $.each(response, function(k,v){
                                    $.each(v,function(kk,vv){
                                        recordIDS.push(parseInt(vv));
                                    });
                                });
                                var productIDS=recordIDS;
                                if(productIDS.length > 0){
                                    $.xmlrpc({
                                        url: url+'xmlrpc/object',
                                        methodName: 'execute',
                                        params: [$.settings['database'],userID,$.settings['password'],model,'read',productIDS,[valueField,labelField]],
                                        success: function(response, status, jqXHR) {
                                            $.each(response,function(k,v){
                                                records = [];
                                                if(typeof(v) =='object'){
                                                    $.each(v,function(kk,vv){
                                                        var group = {
                                                            id: vv[valueField],
                                                            name: vv[labelField],
                                                            toString: function() {
                                                                return JSON.stringify(this);
                                                            },
                                                            toLowerCase: function() {
                                                                return this.name.toLowerCase();
                                                            },
                                                            indexOf: function(string) {
                                                                return String.prototype.indexOf.apply(this.name, arguments);
                                                            },
                                                            replace: function(string) {
                                                                var value = '';
                                                                value += this.name;
                                                                if (typeof(this.level) != 'undefined') {
                                                                    value += ' <span class="pull-right muted">';
                                                                    value += this.level;
                                                                    value += '</span>';
                                                                }
                                                                return String.prototype.replace.apply('<div style="padding: 10px; font-size: 1.5em;">' + value + '</div>', arguments);
                                                            }
                                                        };
                                                        records.push(group);
                                                    });
                                                    process(records);
                                                }
                                            });
                                        },
                                        error: function(jqXHR, status, error) {
                                            msg='Reading '+model+' failed with error ';
                                            if ($.debugLevel == 1) {
                                                msg +="\n\nServer Response:\n"+error.message
                                            }    
                                            alert(msg);
                                        }
                                    });
                                }
                            },
                            error: function(jqXHR, status, error) {
                                msg='Reading '+model+' failed with error ';
                                if ($.debugLevel == 1) {
                                    msg +="\n\nServer Response:\n"+error.message
                                }    
                                alert(msg);
                                            
                            }
                        });
                    }
                    
                    
                    
                }
            },
            property: 'name',
            items: 10,
            minLength: 0,
            updater: function(item) {
                var name = $(this.$element).attr('name');
                name = name.replace('_name', '_id');
                var item = JSON.parse(item);
                $('[name="' + name + '"]').val(item.id);
                return item.name;
            }
        });
        
        form.find('form').nod([
            [ '#data-serial-number-name', 'presence', 'Cannot be empty' ],
            [ '#data-name', 'presence', 'Cannot be empty' ],
            [ '#data-product-name', 'presence', 'Cannot be empty' ],
            [ '#data-quantity', 'presence', 'Cannot be empty' ],
            [ '#data-quantity', 'integer', 'Must be a whole number' ],
            [ '#data-uom-name', 'presence', 'Cannot be empty' ],
            [ '#data-source-location-name', 'presence', 'Cannot be empty' ],
            [ '#data-destination-location-name', 'presence', 'Cannot be empty' ]
            ],{
                'submitBtnSelector':'.save-stock-move-done',
                'errorClass':'label-warning'
            });
    }
    $(document).on('click', '.create-stock-move', function() {
        var iso = (new Date()).toISOString().match(/(\d{4}\-\d{2}\-\d{2})T(\d{2}:\d{2}:\d{2})/)
        var form = $('.page').hide().filter('#form-view').show().html($.stockMoveFormTpl({
            'date':iso[1]+' '+iso[2],
            'scheduled_date':iso[1]+' '+iso[2],
            'editable':true
        }));
        initAutocomplete(form);
    });

    //hovering
    jQuery('ul.nav li.dropdown').hover(function() {
        jQuery(this).find('.dropdown-menu').stop(true, true).delay(200).fadeIn();
    }, function() {
        jQuery(this).find('.dropdown-menu').stop(true, true).delay(200).fadeOut();
    });
    $(document).on('click', '.save-stock-move-done', function() {
        var record = {};
        $.each($(this).closest('form').serializeArray(), function(k, v) {
            record[v.name] = v.value;
        });
        if (record.id == '') {
            delete(record['id']);
        }
        var fields={
            'id':'id',
            'product_id':'product_id',
            'product_uom':'uom_id',
            'location_id':'source_location_id',
            'location_dest_id':'destination_location_id',
            'state':'status_id',
            'prodlot_id':'serial_number_id',
            'product_qty':'quantity',
            'name':'name',
            'date':'date',
            'date_expected':'scheduled_date'
        };
        $.each(fields,function(kkk,vvv){
            if(typeof(record[vvv]) !=='undefined'){
                fields[kkk]=record[vvv];
            }else{
                delete(fields[kkk]);
            }
        });
        // mark move done;
        fields['state']='done';
        if(
            $.defined(typeof $.settings['application_server_url'])
            &&
            $.defined(typeof $.settings['database'])
            && 
            $.defined(typeof $.settings['user_id'])
            ){
            var url=$.settings['application_server_url']+($.settings['application_server_url'].substring(-1) =='/'?'':'/');
            if($.defined(typeof fields['id'])){
                $.xmlrpc({
                    url: url+'xmlrpc/object',
                    methodName: 'execute',
                    params: [$.settings['database'],$.settings['user_id'],$.settings['password'],'stock.move','write',[fields['id']],fields],
                    success: function(response, status, jqXHR) {
                        alert("Stock Move Saved.");
                        $.setHash('showStockMoves');
                    },
                    error: function(jqXHR, status, error) {
                        var msg="Stock move could not be updated.";
                        if ($.debugLevel == 1) {
                            msg +="\n\nPosted Data:\n"+JSON.stringify(fields);
                            msg +="\n\nServer Response:\n"+error.message
                        }    
                        alert(msg);
                    }
                });    
            }else{
                $.xmlrpc({
                    url: url+'xmlrpc/object',
                    methodName: 'execute',
                    params: [$.settings['database'],$.settings['user_id'],$.settings['password'],'stock.move','create',fields],
                    success: function(response, status, jqXHR) {
                        alert("Stock Move Created.");
                        $.setHash('showStockMoves');
                    },
                    error: function(jqXHR, status, error) {
                        var msg="Stock move could not be created.";
                        if ($.debugLevel == 1) {
                            msg +="\n\nPosted Data:\n"+JSON.stringify(fields);
                            msg +="\n\nServer Response:\n"+error.message
                        }    
                        alert(msg);
                    }
                });
            }
        }
    });
    $.showSettingsForm=function() {
        var record = $.settings;
        var iso = (new Date()).toISOString().match(/(\d{4}\-\d{2}\-\d{2})T(\d{2}:\d{2}:\d{2})/)
        if(typeof(record['read_stockmove_starting_from']) ==='undefined' || record['read_stockmove_starting_from'] ==""){
            record['read_stockmove_starting_from']=iso[1];
        }
        $('.page').hide().filter('#form-view').show().html($.settingsFormTpl(record))
        .find('form').nod([
            [ '#data-user_name', 'presence', 'Cannot be empty' ],
            [ '#data-password', 'presence', 'Cannot be empty' ],
            [ '#data-database', 'presence', 'Cannot be empty' ],
            [ '#data-application_server_url', 'presence', 'Cannot be empty' ],
            [ '#data-client_sync_freq_with_server', 'presence', 'Cannot be empty' ],
            [ '#data-client_sync_freq_with_server', 'integer', 'Must be a whole number' ],
            [ '#data-offline_duration_server', 'presence', 'Cannot be empty' ],
            [ '#data-offline_duration_server', 'integer', 'Must be a whole number' ],
            [ '#data-read_stockmove_starting_from', 'presence', 'Cannot be empty' ],
            ],{
                'submitBtnSelector':'#save-settings',
                'errorClass':'label-warning'
            });
        
    }
    
    // Create/Update stock move data.
    $(document).on('click', '#save-settings', function() {
        var record = {};
        $.each($(this).closest('form').serializeArray(), function(k, v) {
            record[v.name] = v.value;
        });
        var url=record['application_server_url']+(record['application_server_url'].substring(-1) =='/'?'':'/')
        $.xmlrpc({
            url: url+'xmlrpc/common',
            methodName: 'login',
            params: [record['database'],record['user_name'],record['password']],
            success: function(response, status, jqXHR) {
                var userID=parseInt(response);
                if(userID > 0){
                    var fields = $.settingsField;
                    var columns = [];
                    var values = [];
                    record['user_id']=userID;
                    $.each(fields, function(k, v) {
                        if ($.defined(typeof record[v])) {
                            localStorage[v]=record[v];
                        }
                    });
                    settings();
                }else{
                    alert("Could not find user with credentials "+record['user_name']+"/"+record['password']+" on remote server");
                }
            },
            error: function(jqXHR, status, error) {
                alert("Could not connect to remote server "+url+", check setting parameters");
            }
        });
    });

    


    
    // main-navbar collapse
    $('.myTab').click(function(event) {
        if ($('.main-navbar').is(":visible")) {
            $('.main-navbar').trigger('click');
        }
    });
    
    //click-table
    $(document).on('click', '#click-table tr', function() {
        location.hash = $(this).find("a").attr("href").split('#')[1];
    });
    
    var chars = []; 
    $(window).keypress(function(e) {
        if (e.which >= 48 && e.which <= 57) {
            chars.push(String.fromCharCode(e.which));
        }
        setTimeout(function(){
            if (chars.length >= $.barcodeLength) {
                var barcode = chars.join("");
                console.log("Barcode Scanned: " + barcode);
                var url=$.settings['application_server_url']+($.settings['application_server_url'].substring(-1) =='/'?'':'/');
                $.xmlrpc({
                    url: url+'xmlrpc/object',
                    methodName: 'execute',
                    params: [$.settings['database'],$.settings['user_id'],$.settings['password'],"stock.production.lot",'search',[["name","=",barcode]]],
                    success: function(response, status, jqXHR) {
                        var recordIDS=[];
                        $.each(response, function(k,v){
                            $.each(v,function(kk,vv){
                                recordIDS.push(parseInt(vv));
                            });
                        });
                        if(recordIDS.length ==0){
                            alert("Barcode not found in system");
                        }else{
                            $.xmlrpc({
                                url: url+'xmlrpc/object',
                                methodName: 'execute',
                                params: [$.settings['database'],$.settings['user_id'],$.settings['password'],"stock.move",'search',[["prodlot_id","=",recordIDS[0]]]],
                                success: function(response, status, jqXHR) {
                                    var stockID=0;
                                    $.each(response, function(k,v){
                                        $.each(v,function(kk,vv){
                                            stockID=parseInt(vv);
                                        });
                                    });
                                    if(stockID > 0){
                                        location.hash='editStockMove/'+stockID;
                                    //$.editStockMove(stockID);
                                    }else{
                                        alert('No stock move found for barcode');
                                    }
                                }
                            });
                        }
                    }
                });
                
            }
            chars = [];
        },500);
    });
    
    settings();
    
    
    
    
})(jQuery);



