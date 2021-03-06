'use strict';
const Koa = require('koa');
var Router = require('koa-router');
var mongoose = require('mongoose');
var log = require('loglevel');
var cors = require('koa-cors');
var autoIncrement = require('mongoose-auto-increment');
var Schema = mongoose.Schema;

log.setLevel('debug');
mongoose.connect('mongodb://mongo:27017/myproject');
var connection = mongoose.createConnection("mongodb://mongo:27017/myproject");

autoIncrement.initialize(connection);

let _ = require('lodash');
const bouncer = require('koa-bouncer');
var passwordSalt  = require('./salt.js');
const koaBody = require('koa-body');

var md5 = require('md5');

var db = mongoose.connection;

var TestCaseResult = mongoose.model('TestCaseResult',{
    groupid:{type:String,require:true},
    title:{type:String,require:true},
    result:{type:String,require:true},
    resultdate:{type:Date}
});

var TestGroupSchema = new Schema({
    groupid:{ type: String,required: true, index: true,unique: true, dropDups: true, sparse: true },
    grouptitle:{type:String,require:true},
    username:{type:String,require:true},
    state:{type:String,require:true}
});

var TestGroup = connection.model('TestGroup', TestGroupSchema);

TestGroupSchema.plugin(autoIncrement.plugin, {
    model: 'TestGroup',
    field: 'groupid',
    startAt: 1,
    incrementBy: 1
});

var UserInfo = mongoose.model('UserInfo', {
    username:{ type: String,required: true, index: true,unique: true, dropDups: true, sparse: true },
    password:{ type: String,required: true},
    token:{ type: String,},
    tokenValidDate:{type:Date}
});

var TestCaseSchema = new Schema({
    title:{type:String,request: true,index:true,unique:true,dropDups:true,sparse:true},
    correct:{ type: String,required: true},
    createdDate:{type:Date},
    testcaseid:{type:Number,requiree:true},
    tags:[]
});

var TestCase = connection.model('TestCase',TestCaseSchema);

TestCaseSchema.plugin(autoIncrement.plugin, {
    model: 'TestCase',
    field: 'testcaseid',
    startAt: 1,
    incrementBy: 1
});

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('opended mongodb');
});

const app = new Koa();
var router = new Router();
app.use(koaBody());
app.use(cors({
    origin: 'http://localhost:3030',
    credentials:true
}));

app.use(async (ctx, next) => {
    
    if (["GET", "HEAD", "DELETE"].indexOf(ctx.method.toUpperCase()) >= 0) {
        ctx.request.body = ctx.request.query;
    }
    let context = ctx;
    const cookieHeader = context.headers.cookie;
    if (cookieHeader) {
        const cookies = cookieHeader.split(';');
        context.cookie = {};
        cookies.forEach(function (item) {
            const crumbs = item.split('=');
            if (crumbs.length > 1) context.cookie[crumbs[0].trim()] = crumbs[1].trim();
        });
    }
    if (ctx.cookie && ctx.cookie.token) {
        ctx.request.body.token = ctx.cookie.token;
    }
    if (ctx.cookie && ctx.cookie.username) {
        ctx.request.body.username = ctx.cookie.username;
    }
    await next();
});

app.use(bouncer.middleware());
app.use(router.routes())
    .use(router.allowedMethods());

async function check_testcase_exist(ctx,title){
    let testcase = await TestCase.find({title:title});
    
    if(testcase.length > 0){
        return true;
    }
    return false;
}

async function query_testcase(ctx,title){
    
    let testcase = await TestCase.findOne({title:title});
    return testcase;
}

async function check_token(ctx,token,username,tokenDate){
    let now = new Date();
    let allUserInfo = await UserInfo.find();
    
    
    let tokenAuthed = await UserInfo.findOne({token:ctx.vals.token,username:ctx.vals.username});
    
    if (tokenAuthed) {
        let tokenDate = tokenAuthed.tokenValidDate;
        let offset = _.subtract(now - tokenDate);
        if(offset > _.multiply(7,_.multiply(_.multiply(_.multiply(1000,60),60),24))){
            ctx.throw(400, 'it\'s too long after last login' );
        }
        return tokenAuthed;
    }
    else{
        ctx.throw(400, 'token invalid');
    }
};

async function  userinfo_check_userexist(username){
    let ret = await UserInfo.findOne({username:username});
    if(ret){
        return false;
    }
    else{
        return true;
    }
}

router.put('/testput',async (ctx,next)=>{
    log.debug('put test put is:',ctx.request,' body:',ctx.request.body);
    await next();
    ctx.body = ctx.request.body;
    ctx.status = 200;
});

router.get('/userinfo',async (ctx,next)=>{
    try{
        
        ctx.validateBody('token')
            .isString()
            .trim();
        ctx.validateBody('username')
            .isString()
            .trim();
        let tokenAuthed = await check_token(ctx,ctx.vals.token,ctx.vals.uesrname);
        
        await next();
        ctx.status = 200;
    }
    catch(e){
        ctx.throw(e);
        // 
    }
    // ctx.status = 200;
});

router.get('/debug_query_test_case', async(ctx,next)=>{
    try{
        ctx.validateBody('tags')
            .isString()
            .trim();
        let tags = ctx.vals.tags.split(',');
        
        let debugTestCasesAll = await TestCase.find();
        
        let findTestCases = await TestCase.find({tags:{"$all" :['carlos','hi'] }});
        
        ctx.status = 200;
    }
    catch(e){
        ctx.throw(e);
    }
});

router.get('/gettestcasesbytags',async (ctx,next)=>{
    ctx.validateBody('username')
        .isString()
        .trim();
    ctx.validateBody('token')
        .isString()
        .trim();
    ctx.validateBody('tags')
        .isString()
        .trim();
    let tokenAuthed = await check_token(ctx,ctx.vals.token,ctx.vals.uesrname);
    await next();
    let tags = ctx.vals.tags.split(',');
    let testcases = await TestCase.find({tags:{"$all" : tags }});
    ctx.body = testcases;
    ctx.status = 200;
});

router.get('/gettestgroupcases',async (ctx,next)=>{
    ctx.validateBody('username')
        .isString()
        .trim();
    ctx.validateBody('token')
        .isString()
        .trim();
    ctx.validateBody('groupid')
        .isString()
        .trim();
    let tokenAuthed = await check_token(ctx,ctx.vals.token,ctx.vals.uesrname);

    await next();
    var debugTestgroupAll = await TestCaseResult.find({groupid:ctx.vals.groupid});
    ctx.body = debugTestgroupAll;
    ctx.status = 200;
});

router.get('/gettestgroups',async (ctx,next)=>{
    ctx.validateBody('username')
        .isString()
        .trim();
    ctx.validateBody('token')
        .isString()
        .trim();
    let tokenAuthed = await check_token(ctx,ctx.vals.token,ctx.vals.uesrname);

    await next();
    var debugTestgroupAll = await TestGroup.find();
    ctx.body = debugTestgroupAll;
    ctx.status = 200;
});

router.post('/battestcaseresult',async (ctx,next)=>{
    ctx.validateBody('username')
        .isString()
        .trim();
    ctx.validateBody('token')
        .isString()
        .trim();
    ctx.validateBody('testcases')
        .isString()
        .trim();
    ctx.validateBody('groupid')
        .isString()
        .trim();

    let tokenAuthed = await check_token(ctx,ctx.vals.token,ctx.vals.uesrname);
    let testgroup = await TestGroup.findOne({groupid:ctx.vals.groupid});
    await next();
    if(!testgroup){
        ctx.throw(404,'error groupid');
    }
    
    testgroup.state = 'wip';
    let ret = await testgroup.save();
    
    let cases = ctx.vals.testcases.split(',');
    let casesLen = cases.length;
    let result = [];
    
    _.map(cases,async (value,index)=>{
        
        let testcase = await TestCase.findOne({testcaseid:value});
        
        result[result.length] = testcase || "";
        if(result.length === casesLen){
            
            testgroup.state = 'ready';
            let ret = await testgroup.save();
            
            
        }
        if(testcase){
            let testcaseresult = new TestCaseResult();
            testcaseresult.groupid = ctx.vals.groupid;
            testcaseresult.title = testcase.title;
            testcaseresult.result = '';
            testcaseresult.resultdate = new Date();
            let ret = await testcaseresult.save();
            
        }
    });
    ctx.status = 200;
});

router.post('/newtestgroup',async (ctx,next)=>{
    ctx.validateBody('username')
        .isString()
        .trim();
    ctx.validateBody('token')
        .isString()
        .trim();
    ctx.validateBody('grouptitle')
        .isString()
        .trim();

    let tokenAuthed = await check_token(ctx,ctx.vals.token,ctx.vals.uesrname);
    await next();
    var testgroup = new TestGroup();
    testgroup.grouptitle = ctx.vals.grouptitle;
    testgroup.username = ctx.vals.username;
    testgroup.state = 'wip';
    var ret = await testgroup.save();
    ctx.status = 200;
});

router.post('/debugpost',async(ctx,next)=>{
    log.debug('post body is:',ctx.request.body);
    await next();
    ctx.status = 200;
});

router.get('/testcases',async (ctx,next)=>{
    ctx.validateBody('username')
        .isString()
        .trim();
    ctx.validateBody('token')
        .isString()
        .trim();
    let tokenAuthed = await check_token(ctx,ctx.vals.token,ctx.vals.uesrname);
    await next();
    let testcases = await TestCase.find();
    ctx.body = testcases;
    ctx.status = 200;
});
router.put('/testcase',async(ctx,next)=>{
    try {
        
        ctx.validateBody('username')
            .isString()
            .trim();
        ctx.validateBody('token')
            .isString()
            .trim();
        ctx.validateBody('title')
            .isString()
            .trim();
        ctx.validateBody('correct')
            .optional()
            .isString()
            .trim();
        ctx.validateBody('tags')
            .optional()
            .isString()
            .trim();

        let testcase = await  query_testcase(ctx,ctx.vals.title);
        
        if(!testcase){
            ctx.status = 400;
            ctx.body = "title is not exist";
            return;
        }
        let tokenAuthed = await check_token(ctx,ctx.vals.token,ctx.vals.uesrname);
        await next();

        if (ctx.vals.tags) {
            testcase.tags = ctx.vals.tags.split(',');
        }
        if(ctx.vals.correct){
            testcase.correct = ctx.vals.correct;
        }
        let saveRet = await testcase.save();
        
        ctx.status = 200;
    } catch (err) {
        log.debug('err is:',err);
        // ctx.throw(err);
        ctx.status = 500;
    } finally {
    }
});
router.post('/testcase',async(ctx,next)=>{
    try {
        
        //     .isString()
        //     .trim();
        ctx.validateBody('username')
            .isString()
            .trim();
        ctx.validateBody('token')
            .isString()
            .trim();
        ctx.validateBody('title')
            .isString()
            .trim();
        ctx.validateBody('correct')
            .isString()
            .trim();
        ctx.validateBody('tags')
            .optional()
            .isString()
            .trim();
        // ctx.vals.token = ctx.cookie.token;
        // ctx.vals.username = ctx.cookie.username;
        // ctx.validateBody('token')
        let tags = [];
        if(ctx.vals.tags){
            tags = ctx.vals.tags.split(',');
        }
        let testcaseExist = await  check_testcase_exist(ctx,ctx.vals.title);
        if(testcaseExist){
            ctx.status = 400;
            ctx.body = "title is exist";
            return;
        }
        let tokenAuthed = await check_token(ctx,ctx.vals.token,ctx.vals.uesrname);
        await next();
        let testcaseToSave = new TestCase({
            title:ctx.vals.title,
            correct:ctx.vals.correct,
            createdDate: new Date(),
            tags:tags
        });
        let saveRet = await testcaseToSave.save();
        
        ctx.status = 200;
    } catch (err) {
        log.debug('err is:',err);
        // ctx.throw(err);
        ctx.status = 500;
    } finally {
    }
});

router.post('/testcase',async(ctx,next)=>{
    try {
        
        //     .isString()
        //     .trim();
        ctx.validateBody('username')
            .isString()
            .trim();
        ctx.validateBody('token')
            .isString()
            .trim();
        ctx.validateBody('title')
            .isString()
            .trim();
        ctx.validateBody('correct')
            .isString()
            .trim();
        ctx.validateBody('tags')
            .optional()
            .isString()
            .trim();
        // ctx.vals.token = ctx.cookie.token;
        // ctx.vals.username = ctx.cookie.username;
        // ctx.validateBody('token')
        let tags = [];
        if(ctx.vals.tags){
            tags = ctx.vals.tags.split(',');
        }
        let testcaseExist = await  check_testcase_exist(ctx,ctx.vals.title);
        if(testcaseExist){
            ctx.status = 400;
            ctx.body = "title is exist";
            return;
        }
        let tokenAuthed = await check_token(ctx,ctx.vals.token,ctx.vals.uesrname);
        await next();
        let testcaseToSave = new TestCase({
            title:ctx.vals.title,
            correct:ctx.vals.correct,
            createdDate: new Date(),
            tags:tags
        });
        let saveRet = await testcaseToSave.save();
        
        ctx.status = 200;
    } catch (err) {
        log.debug('err is:',err);
        // ctx.throw(err);
        ctx.status = 500;
    } finally {
    }
});

router.get('/login', async (ctx,next)=>{
    try{
        
        ctx.validateBody('username')
            .isString()
            .trim();
        ctx.validateBody('password')
            .isString()
            .trim();
        let password = md5(ctx.vals.password+passwordSalt);

        let loginRet = await UserInfo.findOne({username:ctx.vals.username,password:password});
        if (loginRet) {
            ctx.status = 200;
            let time = new Date();
            let token = md5(ctx.vals.username+ctx.vals+password+time);
            loginRet.token = token;
            loginRet.tokenValidDate = time;
            let saveRet = await loginRet.save();
            
            ctx.body = {token:token};
            ctx.cookies.set('token', token);
            ctx.cookies.set('username',ctx.vals.username);

            return;
        }
        else{
            ctx.status = 401;
            return;
        }
    }
    catch(e){
        ctx.body = e;
        ctx.status = 400;
    }
});

router.get('/register', async (ctx, next) => {
    let query = ctx.request.query;
    try{
        ctx.validateBody('username')
            .isString()
            .trim();
        ctx.validateBody('password')
            .isString()
            .trim();

        ctx.validateBody('username')
            .check(await userinfo_check_userexist(query.username), 'Username taken');

        log.debug(ctx.vals);
        let newsuer = new UserInfo({
            username:query.username,
            password:md5(query.password+passwordSalt)
        });
        let ret = await newsuer.save();
        log.debug("save user ret:",ret);
        await next();
        ctx.status = 200;
    }
    catch(e){
        ctx.body = e;
        ctx.status = 400;
    }
});

router.get('/', async (ctx, next) => {
    // ctx.router available
    await next();
    ctx.body = 'Hello World carlos';
});

app.listen(3000);
