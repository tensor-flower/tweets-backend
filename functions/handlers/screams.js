const {db} = require('../util/admin')

exports.getAllScreams=(request,response)=>{
    db.collection("screams")
    .orderBy('createdAt','desc')
    .get().then(data=>{
        let screams=[]
        data.forEach(doc=>{
            //console.log(doc.data())
            screams.push({
                screamId:doc.id,
                body:doc.data().body,
                userHandle:doc.data().userHandle,
                createdAt:doc.data().createdAt,
                userImage:doc.data().userImage
            })
        })
        return response.json(screams)
    }).catch(err=>console.error(err))
}

exports.postOneScream = (request,response)=>{
    if(request.body.body.trim()===''){
        return resquest.status(400).json({body:'Body must not be empty'})
    }
    const newScream = {
        body:request.body.body,
        userHandle: request.user.handle,
        userImage:request.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount:0,
        commentCount:0
    }
    //firebase auto generate id by using add
    db.collection('screams').add(newScream)
    .then(doc =>{
        newScream.screamId = doc.id
        response.json(newScream)
    }).catch(err=>{
        response.status(500).json({error: 'something went wrong'})
        console.error(err)
    })
}

exports.getScream=(req,res)=>{
    let screamData ={}
    db.collection('screams').doc(`${req.params.screamId}`).get()
    .then(doc=>{
        if(!doc.exists){
            return res.status(404).json({error:'scream not found'})
        }
        screamData = doc.data()
        screamData.screamId = doc.id
        return db.collection('comments')
        .orderBy('createdAt', 'desc')
        .where('screamId','==',req.params.screamId).get()
        .then(snapshot=>{
            screamData.comments=[]
            snapshot.forEach(doc=>{
                screamData.comments.push(doc.data())
            })
            return res.json({screamData})
        })
    })
    .catch(err=>{
        console.error(err)
        res.status(500).json(err)
    })
}

exports.commentOnScream = (req,res)=>{
    if(req.body.body.trim()===''){
        return res.status(400).json({comment:'Must not be empty'})
    }      
    const newComment = {
        body:req.body.body,
        createdAt:new Date().toISOString(),
        screamId:req.params.screamId,
        userHandle:req.user.handle,
        userImage: req.user.imageUrl 
    }
    
    db.doc(`/screams/${req.params.screamId}`).get()
    .then(doc=>{
        if(!doc.exists){
            return res.status(404).json({error:'scream not found'})
        }
        return doc.ref.update({commentCount:doc.data().commentCount+1})
        .then(()=>{
            return db.collection('comments').add(newComment)
        })
        .then(()=>{
            return res.json(newComment)
        })
    })
    .catch(err=>{
        console.error(err)
        res.status(500).json(err)
    })
}

exports.likeScream=(req,res)=>{
    const likeDocument=db.collection('likes')
    .where('screamId','==',req.params.screamId)
    .where('userHandle','==',req.user.handle).limit(1)
    const screamDocument = db.doc(`/screams/${req.params.screamId}`)

    let likeCnt
    screamDocument.get()
    .then(doc=>{
        //check if scream exists
        if(!doc.exists) return res.status(404).json({error:'scream not found'})
        likeCnt = doc.data().likeCount
        return likeDocument.get()
        .then(doc=>{
            //check if already liked
            if(!doc.empty) return res.status(404).json({error:'scream already liked'})
            const like={}
            like.userHandle=req.user.handle
            like.screamId=req.params.screamId
            return db.collection('likes').add(like)
            .then(()=>{
                return screamDocument.update({likeCount:likeCnt+1})
            })
            .then(()=>{
                return res.json({message:'liked'})
            })
        })
    })
    .catch(err=>{
        console.error(err)
        res.status(500).json(err)
    })
}

exports.unlikeScream=(req,res)=>{
    const likeDocument=db.collection('likes')
    .where('screamId','==',req.params.screamId)
    .where('userHandle','==',req.user.handle).limit(1)
    const screamDocument = db.doc(`/screams/${req.params.screamId}`)

    let likeCnt
    screamDocument.get()
    .then(doc=>{
        //check if scream exists
        if(!doc.exists) return res.status(404).json({error:'scream not found'})
        likeCnt = doc.data().likeCount
        return likeDocument.get()
        .then(snapshot=>{
            //check if already liked
            if(snapshot.empty) return res.status(404).json({error:'scream not liked'})
            return db.doc(`/likes/${snapshot.docs[0].id}`).delete()
            .then(()=>{
                return screamDocument.update({likeCount:likeCnt-1})
            })
            .then(()=>{
                return res.json({message:'unliked'})
            })
        })
    })
    .catch(err=>{
        console.error(err)
        res.status(500).json(err)
    })
}

exports.deleteScream=(req,res)=>{
    const docToBeDeleted = db.collection('screams').doc(req.params.screamId)
    docToBeDeleted.get()
    .then(doc=>{
        if(!doc.exists){
            return res.status(404).json({error:'scream not found'})
        }
        if(doc.data().userHandle!==req.user.handle){
            return res.status(403).json({error:'unauthorized'})
        }
        return docToBeDeleted.delete()
        .then(()=>{
            return res.json({message:'scream deleted'})
        })
    })
    .catch(err=>{
        console.error(err)
        return res.status(500).json(err)
    })
}