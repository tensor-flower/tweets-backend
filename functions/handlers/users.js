const {admin,db} = require('../util/admin')
const firebaseConfig=require('../util/config')
// Initialize Firebase
const firebase=require('firebase/app')
require('firebase/auth')
firebase.initializeApp(firebaseConfig);

const {validateSignupData,reduceUserDetails,validateLoginData} = require('../util/validation')

exports.signup=(req,res)=>{
    const newUser = {
        email:req.body.email,
        password:req.body.password,
        confirmPassword:req.body.confirmPassword,
        handle:req.body.handle,
    }

    const {valid,errors} = validateSignupData(newUser)
    if(!valid)    return res.status(400).json(errors)

    const noImg = 'blank-profile.png'

    let token,userId
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc=>{
        if(doc.exists){
            return res.status(400).json({handle:'handle is already taken'})
        }else{
            return firebase.auth()
            .createUserWithEmailAndPassword(newUser.email,newUser.password)
            .then(data=>{
                userId = data.user.uid
                return data.user.getIdToken()
            })
            .then(tokenId=>{
                token=tokenId
                const userCredentials={
                    handle:newUser.handle,
                    email:newUser.email,
                    createdAt:new Date().toISOString(),
                    imageUrl:`https://firebasestorage.googleapis.com/v0/b/${
                        firebaseConfig.storageBucket
                    }/o/${noImg}?alt=media`,
                    userId
                }
                //specify id by using set
                return db.doc(`/users/${newUser.handle}`).set(userCredentials)
            })
            .then(()=>{
                return res.status(201).json({token})
            })
            .catch(err=>{
                console.error(err)                
                if(err.code==="auth/email-already-in-use"){
                    return res.status(400).json({email:'Email already in use'})
                }else if(err.code==="auth/weak-password"){
                    return res.status(400).json({password:'weak password'})
                }
                else{
                    return res.status(500).json({general:err.code})
                }
            })
        }
    }).catch(err=>{
        console.log(err)
        //TODO will this return multiple responses?
        return res.status(500).json({general:err.code})
    })
}

exports.login=(req,res)=>{
    const user={
        email:req.body.email,
        password:req.body.password
    }
    const { valid, errors } = validateLoginData(user);

    if (!valid) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email,user.password)
    .then(data=>{
        return data.user.getIdToken()
    })
    .then(token=>{
        return res.json({token})
    })
    .catch(err=>{
        console.error(err)
        return res.status(403).json({general:'Wrong credentials, please try again'})
    })
}

exports.addUserDetails = (req,res)=>{
    let userDetails = reduceUserDetails(req.body)
    db.doc(`/users/${req.user.handle}`).update(userDetails)
    .then(()=>{
        return res.json({message:'Details added successfully'})
    })
    .catch(err=>{
        console.error(err)
        return res.status(500).json(err)
    })
}

exports.getAuthenticatedUser=(req,res)=>{
    let userData={}
    //db.doc(`/users/${req.user.handle}`).get()
    db.collection('users').doc(`${req.user.handle}`).get()
    .then(doc=>{
        userData.credentials = doc.data()
        return db.collection('likes')
        .where('userHandle','==',req.user.handle).get()
    })
    .then(data=>{
        userData.likes=[]
        data.forEach(doc=>{
            userData.likes.push(doc.data())
        })
        //can you create notifiation with recipient handle as id?
        return db.collection('notifications')
        .where('recipient','==',req.user.handle)
        .orderBy('createdAt','desc').limit(10).get()
        .then(data=>{
            userData.notifications = []
            data.forEach(doc=>{
                userData.notifications.push({
                    recipient:doc.data().recipient,
                    sender:doc.data().sender,
                    createdAt:doc.data().createdAt,
                    screamId:doc.data().screamId,
                    type:doc.data().type,
                    read:doc.data().read,
                    notificationId: doc.id
                })
            })
            return res.json(userData)
        })
    })
    .catch(err=>{
        console.error(err)
        return res.status(500).json(err)
    })
}

exports.uploadImage = (req,res)=>{
    const BusBoy = require('busboy'),
        path=require('path'),
        os=require('os'),
        fs=require('fs')

    const busboy=new BusBoy({headers:req.headers})
    let imageToBeUploaded={}
    let imageFileName=''

    busboy.on('file',(fieldname,file,filename,encoding,mimetype)=>{
        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
            return res.status(400).json({ error: 'Wrong file type submitted' });
        }
        const imageExtension = filename.split('.')[filename.split('.').length-1]
        imageFileName = `${Math.round(Math.random() * 1000000000000)
            .toString()}.${imageExtension}`;
        console.log(imageFileName)  
        const saveTo = path.join(os.tmpdir(), imageFileName)
        imageToBeUploaded={saveTo,mimetype}
        file.pipe(fs.createWriteStream(saveTo))
    })
    busboy.on('finish', ()=> {
        admin.storage().bucket().upload(imageToBeUploaded.saveTo,{
            resumable: false,
            metadata:{
                metadata:{
                    contentType:imageToBeUploaded.mimetype
                }
            }
        })
        .then(()=>{
            const imageUrl=`https://firebasestorage.googleapis.com/v0/b/${
                firebaseConfig.storageBucket
            }/o/${imageFileName}?alt=media`
            return db.doc(`/users/${req.user.handle}`).update({imageUrl})
        })
        .then(()=>{
            return res.json({message:'image uploaded successfully'})
        })
        .catch(err=>{
            console.error(err)
            return res.status(500).json(err)
        })
    });
    busboy.end(req.rawBody)
}

//public get user details
exports.getUserDetails=(req,res)=>{
    let userData={}
    db.doc(`users/${req.params.handle}`).get()
    .then(doc=>{
        if(!doc.exists) return res.status(404).json({error:'user not found'})
        userData.user=doc.data()
        return db.collection('screams').where('userHandle','==',req.params.handle)
        .orderBy('createdAt','desc').get()
        .then(data=>{
            userData.screams=[]
            if(!data.empty)
            data.forEach(doc=>{
                userData.screams.push({
                    body:doc.data().body,
                    createdAt:doc.data().createdAt,
                    userHandle:doc.data().userHandle,
                    userImage:doc.data().userImage,
                    likeCount:doc.data().likeCount,
                    commentCount:doc.data().commentCount,
                    screamId:doc.id
                })
            })
            return res.json(userData)
        })
    })
    .catch(err=>{
        console.error(err)
        return res.status(500).json({error:err.code})
    })
}

exports.markNotificationRead=(req,res)=>{
    let batch = db.batch()
    req.body.forEach(notificationId=>{
        const notification=db.doc(`notifications/${notificationId}`)
        batch.update(notification, {read:true})
    })
    batch.commit().then(()=>{
        return res.json({message:'notifications marked read'})
    })
    .catch(err=>{
        console.error(err)
        return res.status(500).json(err)
    })
}
