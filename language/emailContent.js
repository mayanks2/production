"use strict";
var config = require("../config/config");
var environment =
  config.app.environmentURL;
var cloverURL =
  config.app.cloverURL;
module.exports = {
  ADMIN: {
    GOTU_SIGNUP: {
      subject: `Gotu Signup Request`,
      html: `<br>Business %DBA% want to signup for %BODY%. Below is the basic merchant information.<br>Name: %FNAME%  %LNAME%<br>Email: %EMAIL%<br>Phone Number: %PHONE_NUMBER% <br>Thanks`,
      body: `Gotu`,
      emailTo: `gauravdeepmchetu@gmail.com`
    },
    YEXT_SIGNUP: {
      subject: `Yext Signup Request`,
      html: `<br>Business %DBA% want to signup for %BODY%. Below is the basic merchant information.<br>Name: %FNAME%  %LNAME%<br>Email: %EMAIL%<br>Phone Number: %PHONE_NUMBER% <br>Thanks`,
      body: `Yext`,
      emailTo: `gauravdeepmchetu@gmail.com`
    },
    TAP_TEXT: {
      subject: `Tap Text Signup Request`,
      html: `<br>Business %DBA% want to signup for %BODY%. Below is the basic merchant information.<br>Name: %FNAME%  %LNAME%<br>Email: %EMAIL%<br>Phone Number: %PHONE_NUMBER% <br>Thanks`,
      body: `Tap Text`,
      emailTo: `gauravdeepmchetu@gmail.com`
    },
    PUSH_SIGNUP: {
      subject: `Push Signup Request`,
      html: `<br>Business %DBA% want to signup for %BODY%. Below is the basic merchant information.<br>Name: %FNAME%  %LNAME%<br>Email: %EMAIL%<br>Phone Number: %PHONE_NUMBER% <br>Thanks`,
      body: `Tap Push`,
      emailTo: `gauravdeepmchetu@gmail.com`
    }
  },
  MERCHANT: {
    GOTU_SIGNUP: {
      subject: `Gotu Signup Request`,
      html: `Hi %DBA%,<br> Your signup request for %BODY% was sent and you should be contacted soon.<br>Thanks`,
      body: `Gotu`
    },
    YEXT_SIGNUP: {
      subject: `Yext Signup Request`,
      html: `Hi %DBA%,<br> Your signup request for %BODY% was sent and you should be contacted soon.<br>Thanks`,
      body: `Yext`
    },
    TAP_TEXT: {
      subject: `Tap Text Signup Request`,
      html: `Hi %DBA%,<br> Your signup request for %BODY% was sent and you should be contacted soon.<br>Thanks`,
      body: `Tap Text`
    },
    PUSH_SIGNUP: {
      subject: `Push Signup Request`,
      html: `Hi %DBA%,<br> Your signup request for %BODY% was sent and you should be contacted soon.<br>Thanks`,
      body: `Tap Push`
    }
  },
  MERCHANT_ACTIVE_INACTIVE: {
    subject: `Merchant inactivity details`,
    html: `<p>Hi,</p> <p>In attachment for inactive merchant details</p> <p></p><p>Thanks</p>`,
    to: `chandans2@chetu.com`
  },
  OPTIN_OFFER_MAIL: {
    subject: `TAP Clover Coupon`,
    html: `<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Email Newsletter</title> <style> table tr td { padding: 0; font-family:Roboto-Regular,Helvetica,Arial,sans-serif; } .email-btn { padding: 7px 14px; background-color: #59ca46; color: #fff; font-size: 16px; text-align: center; display: inline-block; text-decoration: none; font-weight: 700; margin: 20px auto; } </style> </head> <body> <table width="100%" cellpadding="0" cellspacing="0"> <tr> <td> <table id="top-message" cellpadding="20" cellspacing="0" width="600" align="center"> <tr> <td style="padding: 30px 0px; background-color: #fff; background-image: url(https://boarding.taplocalmarketing.com/assets/images/header-bg.jpg); background-size: cover; border-top: 5px solid #59ca46; border-bottom: 1px solid #ccc;"> <img src="https://boarding.taplocalmarketing.com/assets/images/logo.png" alt="logo" style="width: 200px; margin: 0 auto; display: block;"> </td> </tr> <tr> <td> <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#fff" style="margin: 30px auto"> <tr> <td style="color: #000;"> <h2 style="color: #59ca46; margin: 0; font-size: 24px; text-align: center;">%SUBJECT%</h2> </td> </tr> <tr> <td> <p style="color: #000; font-size: 16px; text-align: center; line-height: 24px; padding-top: 20px;">%BODY%</p> </td> </tr> </table> </td> </tr> <tr> <td> <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFF" style="border-top: 1px solid #ccc;"> <tr> <td style="padding:20px 20px; font-size: 12px; text-align: center;"> <img src="https://boarding.taplocalmarketing.com/assets/images/logo.png" alt="logo" style="width: 160px; margin: 0 auto; display: block;"> </td> </tr> <tr> <td style="text-align: center; padding: 10px 0px;"> <p>&copy; 2017 Corp. All Rights Reserved </p> </td> </tr> </table> </td> </tr> </table> </td> </tr> </table><!-- Main Table --> </body> </html>`,
    from_mail: `admin@tapclover.com`
  },
  NEW_MERCHANTS_REGISTRATION: {
    subject: `New Merchants registered %DBA%`,
    body:
      '<p>New Merchants registered.Please find the details below.</p><br/><table border="1"><tbody><tr><th>Merchant ID</th><td>%MERCHANT_ID%</td></tr><tr><th>DBA</th><td>%DBA%</td></tr><tr><th>First Name</th><td>%FIRST_NAME%</td></tr><tr><th>Last Name</th><td>%LAST_NAME%</td></tr><tr><th>Phone Number</th><td>%PHONE_NUMBER%</td></tr><tr><th>Email</th><td>%EMAIL_ADDRESS%</td></tr><tr><th>Address</th><td>%ADDRESS_1%</td></tr></tbody></table><br/><br/>Thanks',
    html: `<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Email Newsletter</title> <style> table tr td { padding: 0; font-family:Roboto-Regular,Helvetica,Arial,sans-serif; } .email-btn { padding: 7px 14px; background-color: #59ca46; color: #fff; font-size: 16px; text-align: center; display: inline-block; text-decoration: none; font-weight: 700; margin: 20px auto; } </style> </head> <body> <table width="100%" cellpadding="0" cellspacing="0"> <tr> <td> <table id="top-message" cellpadding="20" cellspacing="0" width="600" align="center"> <tr> <td style="padding: 30px 0px; background-color: #fff; background-image: url(https://boarding.taplocalmarketing.com/assets/images/header-bg.jpg); background-size: cover; border-top: 5px solid #59ca46; border-bottom: 1px solid #ccc;"> <img src="https://boarding.taplocalmarketing.com/assets/images/logo.png" alt="logo" style="width: 200px; margin: 0 auto; display: block;"> </td> </tr> <tr> <td> <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#fff" style="margin: 30px auto"> <tr> <td style="color: #000;"> <h2 style="color: #59ca46; margin: 0; font-size: 24px; text-align: center;">%SUBJECT%</h2> </td> </tr> <tr> <td> <p style="color: #000; font-size: 16px; text-align: center; line-height: 24px; padding-top: 20px;">%BODY%</p> </td> </tr> </table> </td> </tr> <tr> <td> <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFF" style="border-top: 1px solid #ccc;"> <tr> <td style="padding:20px 20px; font-size: 12px; text-align: center;"> <img src="https://boarding.taplocalmarketing.com/assets/images/logo.png" alt="logo" style="width: 160px; margin: 0 auto; display: block;"> </td> </tr> <tr> <td style="text-align: center; padding: 10px 0px;"> <p>&copy; 2017 Corp. All Rights Reserved </p> </td> </tr> </table> </td> </tr> </table> </td> </tr> </table><!-- Main Table --> </body> </html>`,
    to: `admin@tapclover.com` //sales@taplocalmarketing.com
  },
  AUTO_RESPONSE_MAIL: {
    subject: `Reminder: You have %COUNT% %TYPE% responses left! - TAPLocal Review Generation`,
    html: `<html><head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
       </head> <body> 
       <p>Hello From TAPLocal,</p>
       <p>You currently have %COUNT% %TYPE% automatic review responses that haven't been used.  It's best practice to make sure all responses to online reviews are never repeated to ensure positive online reputation.</p>
       <p>To add, remove, or delete responses please login to your online dashboard @ 
       <a href="${environment}dashboard.taplocalmarketing.com/auto_reply_settings.php">${environment}dashboard.taplocalmarketing.com/auto_reply_settings.php</a>
       or if you have a Clover Point Of Sale go to <a href="${cloverURL}">${cloverURL}</a> and login to your dashboard.</p>
       <p>If you have any questions or need support, please contact us : <a href="tel:18448998559">1(844)899-8559</a></p>
       </body> </html>`,
    from_mail: `clients@taplocalmarketing.com`
  },
  IMMEDIATE_AUTO_RESPONSE_MAIL: {
    subject: `You have %COUNT% %TYPE% responses left! - TAPLocal Review Generation`,
    html: `<html><head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
       </head> <body> 
       <p>Hello From TAPLocal,</p>
       <p>You currently have %COUNT% %TYPE% automatic review responses that haven't been used.  It's best practice to make sure all responses to online reviews are never repeated to ensure positive online reputation.</p>
       <p>To add, remove, or delete responses please login to your online dashboard @ 
       <a href="${environment}dashboard.taplocalmarketing.com/auto_reply_settings.php">${environment}dashboard.taplocalmarketing.com/auto_reply_settings.php</a>
       or if you have a Clover Point Of Sale go to <a href="${cloverURL}">${cloverURL}</a> and login to your dashboard.</p>
       <p>If you have any questions or need support, please contact us : <a href="tel:18448998559">1(844)899-8559</a></p>
       </body> </html>`,
    from_mail: `clients@taplocalmarketing.com`
  },
  SSO_AUTO_YEXT_USER_CREATEION_MAIL: {
    subject: `ALERT:  Automatic Yext User Account Creation Has Failed - Immediate Intervention Required`,
    html: `<html><head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ALERT:  Automatic Yext User Account Creation Has Failed - Immediate Intervention Required</title>
       </head> <body> 
       <p>Yext automatic user creation failed for the merchant named %MERCHANT_DBA_NAME% at %DATE_TIME% using Yext location id %YEXT_LOCATION_ID%.  Please intervene immediately to manually create this Yext merchant account.  This is an automatic system-generated message.  Please do not reply to this email.</p>
       </body> </html>`,
    from_mail: `clients@taplocalmarketing.com`
  },
  MERCHANT_TIER_NOTIFICATION: {
    english: {
      subject: `You've successfully changed your SMS text limit`,
      from_mail: `clients@taplocalmarketing.com`,
      header:
        "You've successfully changed your SMS text limit, below are the changes:",
      footer1:
        "Your new pricing tier will stay active on a monthly basis until manual changes are made by you.",
      footer2:
        "It is your responsibility to keep your login information private. If this wasn't you please contact TAPLocal immediately @",
      link_text: "Click here if you wish to change your pricing tier."
    },
    spanish: {
      subject: `Usted ha cambiado exitosamente su limite de mensajes de texto`,
      from_mail: `clients@taplocalmarketing.com`,
      header:
        "Ha cambiado exitosamente su limite de textos, que se muestran a continuacion:",
      footer1:
        "Su nuevo nivel de precios permanecera activo mensualmente hasta que realice los cambios manuales.",
      footer2:
        "Es su responsabilidad mantener la privacidad de su informacion del inicio de sesion. Si no fue usted, contacte a TAPLocal inmediatamente @",
      link_text: "Haga clic aqui si desea cambiar su nivel de precios."
    }
  },
  MERCHANT_TIER_DOWNGRADE_NOTIFICATION: {
    english: {
      subject: `You've successfully submitted downgrade request`,
      schedule_change_subject: `You've successfully submitted schedule change request`,
      from_mail: `clients@taplocalmarketing.com`,
      header:
        "You've successfully submitted downgrade request, below are the changes:",
      schedule_change_header:
        "You've successfully submitted schedule change request, below are the changes:",
      footer1:
        "Your new pricing tier will stay active on a monthly basis until manual changes are made by you.",
      footer2:
        "",
      link_text: "Click here if you wish to change your pricing tier."
    },
    spanish: {
      subject: `Has enviado correctamente la solicitud de degradación`,
      schedule_change_subject: `Has enviado correctamente la solicitud de cambio de horario`,
      from_mail: `clients@taplocalmarketing.com`,
      header:
        "Has enviado correctamente la solicitud de degradación, a continuación se muestran los cambios:",
      schedule_change_header:
        "Has enviado correctamente la solicitud de cambio de horario, a continuación se muestran los cambios:",
      footer1:
        "Su nuevo nivel de precios permanecera activo mensualmente hasta que realice los cambios manuales.",
      footer2:
        "",
      link_text: "Haga clic aqui si desea cambiar su nivel de precios."
    }
  },
  MERCHANT_TIER_SMS_LIMT_EXCEED_NOTIFICATION: {
    english: {
      subject: `TAPLocal Alert: You've exceeded your SMS text limit`,
      from_mail: `clients@taplocalmarketing.com`,
      header:
        "You've exceeded your SMS text limit & you have been upgraded to the next pricing tier. Tier details below:",
      footer1:
        "Your new tier will stay active on a monthly basis until manual changes are made by you.",
      footer2:
        "",
      link_text: "Click here if you wish to change your pricing tier."
    },
    spanish: {
      subject: `Alerta TAPLocal: Se ha excedido del limite de mensajes de texto`,
      from_mail: `clients@taplocalmarketing.com`,
      header:
        " Se ha excedido del limite de mensajes de texto y se le actualizo al proximo nivel de precios. A continuacion los detalles del nivel:",
      footer1:
        "Su nuevo nivel permanecera activo mensualmente hasta que haga los cambios manualmente.",
      footer2:
        "",
      link_text: "Haga clic aqui si desea cambiar su nivel de precios."
    }
  },
  MERCHANT_TIER_SMS_LIMT_EXCEED_WRNING: {
    english: {
      subject: `TAPLocal Alert: You've exceeded your SMS text limit`,
      html: `<html><head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>TAPLocal Alert: You've exceeded your SMS text limit</title>
         </head> <body> 
         <p>Hello!</p>
         <p>Great news! You’ve sent ALOT of text message this month which means your customers will be coming in more often to redeem those rewards! Bad news is that you’ve exceeded your monthly text message usage plan. Your plan permits %UPPER_BOUND% messages to be sent per month and you’ve sent %SENT_SMS% during your current cycle.</p>
         <p>Don’t worry though, your customers can still redeem and gain promotions. This just means that no text messages will go out until you give us a call and upgrade your plan or your cycle refreshes on %CYCLE_REFRESH_DATE%. Please contact TAPLocal Marketing @ <a href='tel:%LINK_PHONE_NUMBER%'>%PHONE_NUMBER%</a> or email us at <a href="mailto:support@taplocalmarketing.com">support@taplocalmarketing.com</a> at your earliest convenience.</p>
         <p>Thank you,</p>
         <p>TAPLocal Support</p>
         </body> </html>`,
      from_mail: `clients@taplocalmarketing.com`
    },
    spanish: {
      subject: `Alerta TAPLocal: Se ha excedido del limite de mensajes de texto`,
      html: `<html><head>
       <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
       <meta name="viewport" content="width=device-width, initial-scale=1">
       <title>Alerta TAPLocal: Se ha excedido del limite de mensajes de texto</title>
          </head> <body> 
          <p>Hola!</p>
          <p>¡Una gran noticia! ¡Has enviado MUCHOS mensajes de texto este mes, lo que significa que tus clientes vendrán con más frecuencia para canjear esas recompensas! La mala noticia es que ha superado su plan mensual de uso de mensajes de texto. Su plan permite que se envíen %UPPER_BOUND% de mensajes por mes y ha enviado %SENT_SMS% durante su ciclo actual</p>
          <p>Sin embargo, no se preocupe, sus clientes aún pueden canjear y obtener promociones. Esto solo significa que no se enviarán mensajes de texto hasta que nos llame y actualice su plan o se actualice su ciclo en %CYCLE_REFRESH_DATE%. Póngase en contacto con TAPLocal Marketing @ <a href='tel:%LINK_PHONE_NUMBER%'>%PHONE_NUMBER%</a> o envíenos un correo electrónico a <a href="mailto:support@taplocalmarketing.com">support@taplocalmarketing.com</a> a la brevedad posible.</p>
          <p>Gracias,</p>
          <p>TAPLocal Support</p>
          </body> </html>`,
      from_mail: `clients@taplocalmarketing.com`
    }
  },
  ADMIN_TIER_SMS_LIMT_EXCEED_WRNING: {
    english: {
      subject: `Admin TAPLocal Alert: Merchant %DBA% exceeded own SMS text limit`,
      html: `<html><head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
         </head> <body> 
         <p>Hello Admin!</p>
         <p>Merchant %DBA% exceeded own SMS text limit. Merchant plan permits %UPPER_BOUND% messages to be sent per month and he has sent %SENT_SMS% during own current cycle.</p>
         <p>Thank you,</p>
         <p>TAPLocal Support</p>
         </body> </html>`,
      from_mail: `clients@taplocalmarketing.com`
    },
    spanish: {
      subject: `Admin TAPLocal Alert: Merchant %DBA% excedió el límite del texto SMS`,
      html: `<html><head>
       <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
       <meta name="viewport" content="width=device-width, initial-scale=1">
          </head> <body> 
          <p>Hola Admin!</p>
          <p>Merchant %DBA% excedió el límite de texto SMS. El plan de comerciante permite que se envíen %UPPER_BOUND% de mensajes por mes y él ha enviado %SENT_SMS% durante su propio ciclo actual.</p>
          <p>Gracias,</p>
          <p>TAPLocal Support</p>
          </body> </html>`,
      from_mail: `clients@taplocalmarketing.com`
    }
  },
  ACCOUN_MANAGER_TIER_SMS_LIMT_EXCEED_WRNING: {
    english: {
      subject: `Account Team TAPLocal Alert: Merchant %DBA% exceeded own SMS text limit`,
      html: `<html><head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
         </head> <body> 
         <p>Hello Team!</p>
         <p>Merchant %DBA% exceeded own SMS text limit. Merchant plan permits %UPPER_BOUND% messages to be sent per month and he has sent %SENT_SMS% during own current cycle.</p>
         <p>Thank you,</p>
         <p>TAPLocal Support</p>
         </body> </html>`,
      from_mail: `clients@taplocalmarketing.com`
    },
    spanish: {
      subject: `Account Team TAPLocal Alert: Merchant %DBA% excedió el límite del texto SMS`,
      html: `<html><head>
       <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
       <meta name="viewport" content="width=device-width, initial-scale=1">
          </head> <body> 
          <p>Hola Team!</p>
          <p>Merchant %DBA% excedió el límite de texto SMS. El plan de comerciante permite que se envíen %UPPER_BOUND% de mensajes por mes y él ha enviado %SENT_SMS% durante su propio ciclo actual.</p>
          <p>Gracias,</p>
          <p>TAPLocal Support</p>
          </body> </html>`,
      from_mail: `clients@taplocalmarketing.com`
    }
  },
  ADMIN_TIER_NOTIFICATION: {
    subject: `Notification: Tier and Schedule has been assign or updated`,
    from_mail: `clients@taplocalmarketing.com`
  },
  SMS_REACHING_TO_EXCEED_LIMIT: {
    english: {
      subject: `TAPLocal Alert %percentage% remaining of your SMS Limit`,
      body: `<html>
              <head>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
              </head> 
              <body> 
                <p>
                      Please note your monthly SMS text count refreshes on the %day% of each month and  you have %Bound% &nbsp; remaining of your SMS limit.
                      Going over your SMS Limit will cause an overage fee of $ %Overage_fee-less_current_subscription_price% or you can upgrade to your 
                      next available tier.<br/>
                      <a href="%BILLING_LINK%">Click Here to upgrade your price tier and pay a reduced fee!</a>
                </p>
              </body> 
            </html>`
    },
    spanish: {
      subject: `Alerta TAPLocal %percentage% restante de su Limite de textos`,
      body: `<html>
            <head>
              <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
            </head> 
            <body> 
              <p>
                  Note que su conteo de textos se renueva el %day% de cada mes y le queda un %Bound% &nbsp; de su limite de textos.
                  Sobrepasar su limite de textos conllevara un cargo por sobregiro $ %Overage_fee-less_current_subscription_price% o puede 
                  ascender al siguiente nivel disponible.<br/>
                  <a href="%BILLING_LINK%">Haga click aqui para subir al próximo nivel y pagar una tarifa reducida</a>
              </p>
            </body> 
          </html>`
    }
  },
  MERCHANT_TRAINING_TO_ACTIVE: {
    english: {
      name: "Hi %FIRST_NAME%",
      subject: `Welcome to TapLocal Text`,
      from_mail: `clients@taplocalmarketing.com`,
      content: "Welcome to TapLocal Text, your account setup has been completed.",
      content1: "Your billing cycle is on the %DAY% of every month and your current subscription fee is $%CURRENT_PRICE% for %SMS_LIMIT% text messages.",
      footer: "If you have any questions please contact us at <a href='tel:%LINK_PHONE_NUMBER%'>%PHONE_NUMBER%</a>",
    },
    spanish: {
      name: "Hola %FIRST_NAME%",
      subject: `Bienvenido a TapLocal Text`,
      from_mail: `clients@taplocalmarketing.com`,
      content: "Bienvenido a TapLocal Text, la configuracion de su cuenta se ha completado.",
      content1: "Su ciclo de facturacion es el %DAY% de cada mes y su tarifa actual de suscripcion es $%CURRENT_PRICE% para %SMS_LIMIT% mensajes de texto.",
      footer: "Si tiene preguntas puede llamarnos al <a href='tel:%LINK_PHONE_NUMBER%'>%PHONE_NUMBER%</a>",
    }
  },
  templateForReminderSpanish: "Recordatorio: %DBA%  Ud se ha registrado para recibir Cupones por texto. Ud tiene un limite de %DAYS% dias para usar su cupon de %REWARDSTEXT%. Envie HELP para ayuda o STOP para cancelar.",
  templateForReminderEnglish: "Reminder: %DBA% You’ve subscribed to receive SMS Coupons. You have %DAYS% days left to use your coupon for %REWARDSTEXT%. Reply HELP for help. Reply STOP to cancel."
};

