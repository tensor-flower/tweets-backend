const isEmpty=(s)=>{
    if(s.trim()==='')return true
    else return false
}

const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(regEx)) return true;
    else return false;
};

exports.validateSignupData = (newUser)=>{
    let errors={}
    if(isEmpty(newUser.email)){
        errors.email='Must not be empty!'
    }else if(!isEmail(newUser.email)){
        errors.email='Must be a valid email address'
    }

    if(isEmpty(newUser.password))   errors.password='Must not be empty'
    if(newUser.password!==newUser.confirmPassword){
        errors.confirmPassword='Password must match'
    }
    if(isEmpty(newUser.handle)) errors.handle='Must not be empty'

    return{
        errors,
        valid: Object.keys(errors).length===0?true:false
    }
}

exports.reduceUserDetails=(data)=>{
    let userDetails={}
    if(!isEmpty(data.bio))  userDetails.bio=data.bio
    if(!isEmpty(data.website))  userDetails.website=data.website
    if(!isEmpty(data.location))  userDetails.location=data.location
    return userDetails
}
exports.validateLoginData = (data) => {
  let errors = {};

  if (isEmpty(data.email)) errors.email = 'Must not be empty';
  if (isEmpty(data.password)) errors.password = 'Must not be empty';

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};
