-- Generated rollback. Run in one transaction.
begin;
set local search_path to public, extensions;
alter table public."t3a_rce_prohibited_vocabulary" disable trigger user;
delete from public."t3a_rce_prohibited_vocabulary" x where md5((to_jsonb(x) - ARRAY[]::text[])::text) in ('c84c92ff9f239fb9ba0a2c69e779cd7d', 'b4d118295bc811e804b642aeaaa2328c', '6eb22c5c62e5e3c94fddb47fd531251f', '9b70657572b3d7f457b9770b1f14de25', '9bc3b64d6880d33fa9e4e350247fb1dd', '433da47ee2151eb3597ebce3296c2bb8', '75c94da02979c8f2aa6aaae2c9c27d48', 'ff281254161ed4a8c2e84630445161a6', '6077b4a4816de92497ae28db3f77169a', '8341a81539d26de36baf729da92acb4c', '88e6a239307781d1e49e9e4613e5d45e', '6f07aaab834ada6cc5e341afd251712d', '9abf3ecc0a951eeea94937286441dd32', '8a20525b45abaa2d3893bb67d56846e0', '54edea07755da54ee5553bdbf3d5e02d', '74aa7e6dbdd704cc22434a001145941b', 'ff47536e93a6655ea792f107bd876f21', '826201e98ec91b289fb110ae4357d6f8', 'f72ff4fb5c04a558d6e92d9d01036d56', 'f954df3107963fd1b9007d07be1f18f5', '1204616cd17ecceee053589e8f8bc71c', '504fc791f288d06b3eb464104e6d64ed', 'f534a9c6966098e13b34defd4f67d136', '0a6eb9a375565fa4afb0054ce386fdb9', '902cbd47025880f6e00b153996199083', '578c6de69e85422ee9868add2757583b', 'd298b3414bc2268e86e04481ec488ae9', '00ba36994a6ed3d28fd7937a8ac60305', '6380b3af2c7e1845ad369a90bbb6ef0d', '83c48741aba30fe071b2f0fca5602ab4', '61a6604a064b3040129cd35d9f0eb4b2', 'afaa5bfd8e0186c696d30fb5b3557306', '7edc05927d10c3587875642aaff6e27c', 'b3b44732a67ba3d407c6320c7620ecf6', 'c53f0585e4c75850fa8612e56432e331', '9b8c8fd5c96d687571adaa6c9eb20f86', '1fea888b725c5a3902573124f31c6960', 'f9bafca8c6ee0118a3fccdc728391f88', '600c2d4066abe425332d8f981adc8f78', '775fcffa51293108be5223cf83bf8b65', 'd9b1ee59fa5b5f482c86d04b54ec6057', '1092387eb0454168ca1b7fdb9837ba3c', '6b9cb1783cb8a609b60646257613042e', '7bda6be2107cb6a01bdd253826b063a0', 'c685d9e8ac9f596ac1d11df1e128044e', '33b524be3deb6aac28421fd3d0cc2942', '9dad5da439576c754f86a9900820c6e9', '5e75faa956fa801930bf9262bd3fff9a', 'dbc6a52bb72087d480f0ab8fe997bd17', '2c7a5ad45264a87f28bcdb76d227e77b', 'f917d6b2467e9607bf078280edb5c102', '950f07d500780bb1b0b3b1215835c19e', '58d306e3ede267ff964f695651f6759b', '07639d9da94e3c947e08bc07b307e76b', '06ed58d3ff0bc7729a0a5c591e68371e', '056d6a64a1eb7e1206b1c1f8b3a90e34', 'de386de9e9c1dca7a7493ab5b978be53', 'a2a38f29d331d7c0c20b5e0a15e1683c', 'f415d995b6b71450aee3ae9aecf8b935', '59fb1f7fe0994fa9f01faa777233125b', '2a12d46e9b4e435b0e3091fbce88877e', '86d167b57544828473d0eb24c5b605f6', '6238bfafff2434b722853fd1c64723e9', 'c71ad5ab596ca4b9ed788909aeba9854', '0baf6e954cd8c853ba8254e5ab8f5830', 'f6fa3a0c72db02378e371db38ebba2d2', '0fa7e6e80241d4199f949f12109b875c', '323aff1a15ea49e675a6a57d0caf68b1', '4351d0b53b4f87c90b2dbdaeb2aae3a5', 'c0d064e123eab5b7d89172067edad412', '2f76e83134e7ba01c09e23194d7100d8', '83ad417d5bd8e864c31790e63e319a01', 'b73eb27aa0c78ad609210e90c3f2e7fd', '96a1464b9401e52e65fe27d3c97c1bb4', '0d9896a8b4c04ec4870d5f5c1bfef4f4', '4982b1c436288e260186e85b581a46f0', 'e3234541133dc898d1e1e51687c14c70', '6a4928fe030ca3353eb61630745bbdee', '84a6255e2278cf03b5cb6022f356b2fd', 'dc2b7df5e39d627ec9f5df033877e886', 'c5aab02d1e350d065bb58f257230caf9', '8cd7c2b2956ffde14de59aa53af75030', 'e6091565de8d68509e8db6d1ad2e8eab', '787c0034b90050470206d4cbaa6e61ce', 'c228f63029bbcc6bda0313e7ebb12516', 'de6b91b0e29b4d833608daa21f050580', 'f9779e796f8d7143d2f8a2f037cb81df', 'bc65d0067dd91e0ded0d4b1e4c240fa9', '57160364633993db689673f7ece7418a', 'da4f63b377d5e104e64f52555682cd24', 'e1a8fbbe8fa379c6f6684f9be43319af', '98d085d91a575f58a554ea8c9016cfdd', '16d7908bdefd09d8b6980d68a21ffaee', '97eb90d1c4be88916a8cacfec1db37fa', '825084c5e01dd225f75f169a70bfef79', 'de0ae00db266f9344eddb28bd7a23a12', '349e5a8054ac8aeb84f34ec152fc61ea', 'e8ea9009905a10ce18d0eb009331414b', 'cab2aa03dc5f6d03affd7a67c34b2309', '9aad960da7e2e6004aedaa0f0dcf069a', 'a1c120f71d47641bffdb2156048b629b', '877c29d46ce6137f4f08678011f39782', '059048305d7a46f85d8107b6b8dbc041', '00866447cc0d97c8768511b87b7848ab', 'fb21ed3eab2e162e0d33c3c08f20beac', 'b2bd5edacc2ea1013c24d231bff2cd20', '5c66e8dd129d088649f55b6737fab6e2', 'cbe3094eb001c86f5c6bd231842ed01d', 'd4044bfc70ae0fd700a213673c9f7fd4', '034ba3cc9cb51a466f9d7be9049ead49', '54e4cf5baa0d9002f105eb5d6ca1da16', '61506ceb8103b6ecb18ad61d21bfbdf8', 'ce787ddc4747453b6f4129ea2da9a033', 'a563d1d9f5c23181ef99917a0c7a7912', '64b76e81c59cb9e33d47e09a0af7f73c', '00269d9fa9f35739da6aa00401cbfbc8', '091d8096c4f03858b0989a6ee47d7d39', '0335cee752117f57a14ee68217274d5c', '8bd9efc4e65da9c94535e05d540aab2a', '69b64abeeb45d924d43b0082c8c1af34', '85c93f39ef1a61e8e7498e8e3f771919', 'b60a6f5e1f27963db178599697f6af47', '4ef14729152b5ad1b4cf385778d3c8fa', 'e63ee3b5b60fc52170eb34b6511fffed', '598b0d32e90847833aaa0a4f1147ebd3', '2dcbe3e20b5046e492f719121e999e4b', 'e3b0e4685b0c06a60358a689e0d759c6', 'b48e9fcc86862fc781e5afca74b9609d', 'a9be7665d46339694df04eeaed88dd64', '180db46bdac67ec3fa1121b38b02f28a', '2981910639d6978fe1a3b3708e53f53b', 'a73e13b248e0f8d64a558756a2de1b61', '5a11082922d3943204d0d26f753e1cad', '9f6aaad21a825801c1041f18781f2bce', '0a30b45add7219767cadf870090fbc3a', '9166a3a55ffcc739315b0ca8b6b12117', '660a607426fe6e7828a34ed067799469', '1e60459807b1428d405884b6491aae1d', '5cdff1ec521d0d681deafd95b760e85b', 'c1c30b14d8ad4026784d762b95bbe09d', '965e228b0955e55ca9bee694b9bb78af', 'e93327d720bc71a43036961085f99954', '192b1392808098852c1d5d730c3cbd08', '6ca07e044718392bf895b255e58ff41f', '9e590bba3880459a541147c6055f443d', '70e3a28a6f5ed080e3f8ecb39e746d2b', '6106b2e194e2198afed31dc1817b0eda', '21ead3c34a5f8547f3fac63d3a3e85fe', '95010150163f366f69fd7cccc766c334', 'd9f71ca7fdfad8d52169164d99128c16', '6aeb8d988b3732c7ee630549367aa0a3', 'c61f33347b61a4bc51ea102a14336501', '1235a11e1a6703ed8af5dbda7fb1cdde', '3c5d557e8d9c556c138c895e8634a04d', '1880a234affe5439fa6c0f8ae85c2c02', 'f68ef40a99476a5b0696506fc6d604c0', '97cab9ab83ff39fb4c226a9f0ebc9c28', '778f7758391454685b2c16951a9f45e6', '44241af0d55a8bc87031a1bf9ecbdcb8', '091e4ccf8027358e9df3d02bef3e82d7', '06fc4fea637df30bc165dd5f1491d234', '5f159dc33a0bb834747540c6126c89db', '64006e6ed0b987b4ed8f6e546ae4d7c9', '108d8a756207c971c6763e5680c76f7d', 'cb3f8c9ee10eef8d9ca9764a2dbe90af', '26a4340cdb601aa2e25a256afae69950', 'f46b9084c2b4988a2dfe9012db01b202', 'c1f77ad16b875b66df126d8e06abc537', '2958403dec0b287a97ef349c0dddcd3d', '7a2c4e25ab4f4274084422baf89e915e', '6a1644119e40e727f150860429fd4229', '33c21588f1ee5fd57644633893284e60', '7ec0af0206de5fb7f31b12bb6f37318d', '19deccd58556610f65232fee34ae7f6c', 'dbb6fedb8f5be3ecde899b67c9983004', '2beb6c291dd1d65c05f6c3ce425317c2', '281cf86df5179936ff9cae282862bedd', 'fa4dbc15f9203b5a75adf1120bf3e8ea', 'd4d553c4482d6ff3cda02bcde6df3d4a', '4c255e2f1ff75fa5fcd2683a588b87dd', '5eb249dc9107390b81d8480d52072769', 'a837beba716f6c160c43af205e03ac4a', 'dde2968524b42039ad3dc72a11306910', '39eeb180aa9b404e05386aeea56eada5', 'a8c4f5538bf7d7a4e3b9e4f968876612', 'b5cf41d8deb7a8faf99f49ad62828f9f', 'e07b080eee1a6c9cb22fcdd6b2348564', 'd6b991df8bf58627bc9800fe7e2e9400', 'da48ed7cf79cc5cdf3e3c12fa2eaa5a3', 'ecd7740da241232157be6a00c7822fc2', '49faa99424b0aff30f03e81b8d74af98', '5f2bd491f7d71e1e580f3b52fb0e5d7e', '21611444b7d9775b6f95e206f84ab0a3', '8d2cf183fcbf5e942a9487b924b98c02', 'd7e070d93cec1fd5e3cf3ad503d03e2c', '17bd1a5df64b65b6710be35ab0ebdd0c', '74f64c6f98bfb9bc824e12b87951d808', '57a1b84c96dc38e7f8e5d0591a11dab2', '3e49d19bfd66944fbf88209e40f6c687', 'a661509acccb74925fb55102918d9caa', 'c44891eb5e79d9d736546986429ac6c6', '3d09580758ee4bb3ef836ba638315496', '9126506b6d5bdd07b23f80d4e55d659f', '4403c8308d99f99b3d55be27d857ea13', '07348c37a4928d4f9049091c18893a13', '622d42fa96ed60132ba2b4319b898dcb', 'eeca2facd1ccba7186311abfff84746a', 'f14019519f95221cd801063b045b5f4a', '193b581b4967f3b7182ce3ecaa2944bd', '804ac25d1b7a26c20b6e0969440bbf27', '33f881a06b84878c831170f6a03a20df', '45af5f84d80774be22e58f4e30907b60', 'ad7cfb589f7b3113afa5899ec9957130', '1b576703958e93a6678ad27225680a06', '684f11fe771ed91d722f6108843dc5be', 'c33531124239051c4cfcde17759a1ef7', '027cd5df3d37b24b5b4c9b09071a4721', 'e4caf282d29410c2c2c3f7ffe2eefbdd', 'ccc7d576cd322cce21ef7b7e25bff04e', 'bc837be35ebffe32d213ae0ccfdd2392', 'fab4daa4358783ced0d7e0083f65f395', 'c6a292691876e68f372031d3dd5af2f2', '36f77baa2462a2dc2a6afac091b0ba61', '3947d7b39f275f2da49d44880a6c5cae', 'e91829c2cf01f6661b498c734972e7f3', '6109983cb67bbc2b35823c7f3e12f29d', '76677e7539dabc719046ed1fc01361c0', 'cdfd884a2c4b7a3f0b24f8e4c33947d0', '3ed527dffbd18640a28113ad93eb2730', '0a6f03cd1595bf7b2d2c4ca204fd105f', '37050501ec36b64013f3eac37b11e5cf', '44d49323d523d170b2893d884a4044c0', 'e2ed1d8004510640a641fb957a4d4937', '6d0116a78f6cb0acead2704599830c95', 'b61726ad14cb47030369de1a4593ad3f', '100fd09135269fc2bca08e63aa277e3d', '9a0b0835deadf5757134fd3649c0f06c', '7da5ab0a913e1a4fdb61ecb383c10d0b', 'e922dbb5281778d4c830f1e1f89988eb', 'ce48b45c2fc769b1e98dd26bbc2a19a5', 'bce052e821cedace0df740cf7ce588bb', 'c05be6b25e258924ed8d4e3baff4db90', 'fa0f8988f610dde97cc686822cfbcd91', '58227c221b9db9a4334734a7908672f3', '80152d2af82ac3643cf3be1911df57ee', '05195f15fff567e94f2838918578d50f', '2fee1c7e6e895cc39dfd70bb8ce100b7', 'c481e1b18b60d866d612efc0b0be6af1', '783ae3bd5b7e3bbf81c7dda18027d349', 'a5197eb3804edb703a20d67776a48e2b', 'adce4d7179f3f06ccbba629855ac0bf2', 'e7cbc28d663339c1596b70272aac1e9a', 'd770952caeea83be1c13a775aaca9b2a', 'adca8cad27014462712745822b81d3d9', 'b725585603c6d73b5c82b6a634f64496', '5e0c36e89c91946e6706e4adc243e0d5', '76c81b69d82e9f63b287ff5769a038df', '6848d45bbf219c4a12f1ede2d755192b', 'bc891bdcba80da48aafc4bc719855534', '91549aa0c5bbdcba5faf1506078711d3', 'bdc613588730db54ec352bcb1b6e7ad2', '9e889f65bc2d1ac44bb857fe0598de28', '25a26cf5b41f955e8c2284a1ded45b81', '880f7d593ee83b6ccc81e230e8d2ecb4', 'a010d7761fa4ac96b639a50a17476abb', '5c066e342e792399bd3c611caf608538', '5c9b36a27443572d2b4971cc74581a6c', 'e2216ce3f8de13f9c77da947e2141e7d', 'c2f84c294e510a78d9d4d20d74042c90', '65e3a19566ecd51de7fa9782555ab0ae', '1e7a360abb5a83cb3f3d9e5a3685234d', 'db02a93400e7c15ce927261b4e157a07', 'db27099ca071f196026edaebc93aab44', '6c05d5de3918436c3076216ea5e71f1d', '0680933bb0c985d5d83d824c5d7a83d3', '5d5fbdff7932585fb751c5ff97848ed8', 'f6ef8542503e0043c23ae9cfe5c62c5c', '753e2f471c16c1bc6514d8bfb67b2941', '4be353dfe0614a80da8ed59294f687e4', '7da973776cbc909019fbe9a4a8824b2d', '4458cd0881b34c3560ae1430f13d44f0', '3bc289f77710ab5ec848274b63d3b75d', '5d74f0c70d04a86a3040b25488ddbc1e', 'c6155301f5a9098bd7e9bb5b9fd4c758', 'ea4dc38afcf922184740c03c079715fe', 'f180383d84f7b0ab56b3f3d170aeec63', 'b5bea306eaebf2f823ee4b501cbee7cf', 'c55f1c8fe2da2b2edaa54192cd882cd8', '52a186fa2397d7cf804f7b4178ea1e25', '7902007b86387a6541b0f0b331125249', '1052d3cdf7ccc9a3e9d28f3a23e3b9d8', 'b0825ae5a0cf1388974fd914c82b39ca', 'a4cbcd7581a31f21196000c10c1f132e', '0762bb3288f5835710e49053feec69fe', '3f5b499b375ae62a78c466737b774abe', 'c95ec7e374dfc3ade3e15ca290043f83', '4fb45830c245cc792173a88d8cb1b87d', 'b2f23086c74fc9177a51b310c4ffc1b4', '15d01a350fd49b3345dec3ec41a88124', 'c76eb8dbd7f2195a4582a5b589be1f0e', '5951cca685618d2f17ea13fec68f472e', '32a2454b2519a397cf13fc825a1ff66f', 'ea79d4f3c5a87aca9add34c6376fa528', 'b69cb8a0b1e81eb155c1329f47cb2480', 'd3b800ca49347c6791e3f394d2fde2ca', 'c72de6de0cac84c5273023d00d51016a', '426a7b6793ff5f63bce2a222616b2689', '2a85a3ef5ede0d65aef09549263001d9', '3058d9c40e4e7f51686a6deda7bd1199', 'bfafad04d7e2976130314c57f9e7f89a', 'f68b0f3c4fda30f1eed36f892d7d7b4f', '24a376bbde38ae55f3dd5d21c4bbd6b2', 'f8eed35dbe035a390a9ced3188a4a0c9', '03deaec23a4939eeee24495a00af464a', '9a12965fa36b5ed304a6a7c667da22a8', '2784bf1c25f26e74ccd7e9a8d1f6b3aa', '2513fb6f795946c4506fd401097e26d6', '6ca0d00c276c5c4b6608af9a38368a2e', '4ce26d2f69016c835d94bd34a98f5506', '7598330e0a728f56a1d34782bb04198b', 'c357b80e2cc337bd2f6eb1d97de8770b', '71783e2dcf71dc6ada6302380dc117af', '5549101e0463d5dd4c861fa45eef890e', 'dc61541663be9dc8a9b268005b436484', '5a76b0719562cbba46035a1932496021', '2fca5083fca9300812139ee528cd2a2a', '9018dceb48c1d47301cdc5a5047bed26', '088e79dae47b72b32367e378589c149c', '57a04273aadf04bb8e21cc9c39691542', '86e7460b621de6a7a7b4d7526206f6a0', 'f6115edaa1f9083df6eca956c6600197', '14b6b86b8889e33fc1877e3b956bb5ac', 'd7a452c1f468f5f91d5dfb72656ebdf5', 'e7e4486b413420759ddbe6d3b8453f1b');
alter table public."t3a_rce_prohibited_vocabulary" enable trigger user;
drop trigger if exists "t3a_3_attempt_commit_instant" on public."t3a_attempt";
drop trigger if exists "t3a_5_attempt_welfare_flag_trg" on public."t3a_attempt";
drop trigger if exists "t3a_8_cr08_on_revocation_trg" on public."t3a_consent_record";
drop trigger if exists "t3a_9_accessible_on_issue_trg" on public."t3a_d1_ber_report";
drop trigger if exists "t3a_9_cr09_amend_notice_trg" on public."t3a_d1_ber_report";
drop trigger if exists "t3a_0_cr18_progression_row_gate_trg" on public."t3a_d1_progression_decision";
drop trigger if exists "t3a_9_s1_audit_confirmer_trg" on public."t3a_d1_s1_confirmation";
drop trigger if exists "t3a_9_attempt_class_from_welfare_trg" on public."t3a_d1_welfare_withdrawal";
drop trigger if exists "t3a_0_cr08_commit_gate_trg" on public."t3a_observation_record";
drop trigger if exists "t3a_s2_lock_on_commit_trg" on public."t3a_observation_record";
drop policy if exists "t3a_cr01_mask" on public."t3a_d1_s1_confirmation";
drop policy if exists "t3a_cr01_mask" on public."t3a_d1_s1_determination";
drop policy if exists "t3a_cr01_mask" on public."t3a_d1_s1_reveal_response";
drop policy if exists "t3a_cr01_mask" on public."t3a_d1_s1_routing";
alter table public."t3a_attempt" drop constraint if exists "t3a_attempt_superseded_by_fkey";
alter table public."t3a_attempt" drop constraint if exists "t3a_attempt_supersedes_fkey";
alter table public."t3a_attempt" drop constraint if exists "t3a_attempt_welfare_subject_check";
drop index if exists public."t3a_attempt_one_active";
drop index if exists public."t3a_observation_record_one_commit_per_instance_uq";
drop policy if exists "t3a_d1_live_session_read" on public."t3a_d1_live_session";
create policy "t3a_d1_live_session_read" on public."t3a_d1_live_session" as permissive for select to public using (true);
alter table public."t3a_attempt" drop column if exists "commit_at" cascade;
alter table public."t3a_attempt" drop column if exists "exclusion_expiry_at" cascade;
alter table public."t3a_attempt" drop column if exists "superseded_by" cascade;
alter table public."t3a_attempt" drop column if exists "supersedes" cascade;
alter table public."t3a_attempt" drop column if exists "welfare_flag" cascade;
alter table public."t3a_attempt" drop column if exists "welfare_subject" cascade;
alter table public."t3a_cross_context_relationship" drop column if exists "act_types_compatible" cascade;
alter table public."t3a_observation_record" drop column if exists "stage_instance_id" cascade;
revoke all on table public."t3a_d1_live_session" from public, anon, authenticated, service_role;
grant insert, select, update, delete on table public."t3a_d1_live_session" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."t3a_d1_live_session" to service_role;
alter table public."t3a_rce_prohibited_vocabulary" disable trigger user;
insert into public."t3a_rce_prohibited_vocabulary" select * from jsonb_populate_recordset(null::public."t3a_rce_prohibited_vocabulary", $rb$[{"word": "honest", "reason": "character term; names a trait rather than an act", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "dishonest", "reason": "character term", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "integrity", "reason": "character term", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "ethical", "reason": "character term", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "unethical", "reason": "character term", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "trustworthy", "reason": "character term", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "untrustworthy", "reason": "character term", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "character", "reason": "character term", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "principled", "reason": "character term", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "moral", "reason": "character term", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "immoral", "reason": "character term", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "candid", "reason": "character term", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "transparent", "reason": "character term", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "deceptive", "reason": "character term", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "will", "reason": "future-tendency forecast", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "would", "reason": "future-tendency forecast", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "tends to", "reason": "general-tendency statement", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "reliable", "reason": "character term", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "always", "reason": "retrospective broadening", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "never", "reason": "retrospective broadening", "version": "PV-D1-1.0", "created_at": "2026-10-16T16:06:45.563033+00:00", "dimension_id": "D1"}, {"word": "deflected", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "evaded", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "avoided", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "owned", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "accepted responsibility", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "took ownership", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "shifted", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "minimized", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "downplayed", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "stepped up", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "passed the buck", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "owned it", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "dodged", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "hid", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "concealed", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "covered up", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "accountable", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "reliable", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "dependable", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "mature", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "conscientious", "reason": "T3A-D2-EXEC-001 v2.1 Section 5.7a retired vocabulary", "version": "PV-D2-1.0", "created_at": "2026-10-20T16:54:57.447132+00:00", "dimension_id": "D2"}, {"word": "does not support selection, retention, termination or adverse employment action", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "released to your organization", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "named recipient", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "release token", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "redemption passcode", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "Behavioral Evidence Record", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "not yet available for observation", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "score", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "scoring", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "rating", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "rated", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "rank", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "tier", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "grade", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "pass", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "fail", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "competent", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "proficient", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "L1", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "L2", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "L3", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "L4", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "candidate", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "assessment", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "assessed", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "assess", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "certify", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "certified", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "validate", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "validated", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "rubric", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "BARS", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "red flag", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "strong response", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "expected response", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "skill passport", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "behavioral fingerprint", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "observation_level", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "disqualification", "reason": "D2 Section 4.2 retired vocabulary, closed list", "version": "PV-D2-4.2", "created_at": "2026-10-20T17:18:59.928313+00:00", "dimension_id": "D2"}, {"word": "does not support selection, retention, termination or adverse employment action", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "released to your organization", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "named recipient", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "release token", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "redemption passcode", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "Behavioral Evidence Record", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "not yet available for observation", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "score", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "scoring", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "rating", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "rated", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "rank", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "tier", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "grade", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "pass", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "fail", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "competent", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "proficient", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "L1", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "L2", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "L3", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "L4", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "candidate", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "assessment", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "assessed", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "assess", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "certify", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "certified", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "validate", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "validated", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "rubric", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "BARS", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "red flag", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "strong response", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "expected response", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "skill passport", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "behavioral fingerprint", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "observation_level", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "disqualification", "reason": "D3 Section 4.2 retired vocabulary, closed list", "version": "PV-D3-4.2", "created_at": "2026-10-20T20:02:18.627216+00:00", "dimension_id": "D3"}, {"word": "adequate", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "inadequate", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "sufficient", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "insufficient", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "thorough", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "careless", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "reasonable", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "unreasonable", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "timely", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "acceptable", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "complete enough", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "better", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "worse", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "best", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "correct", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "appropriate", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "optimal", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "suboptimal", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "effective", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "ineffective", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "properly", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "improperly", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "poorly", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "successfully", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "unsuccessfully", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "prematurely", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "unnecessarily", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "reliable", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "dependable", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "organized", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "efficient", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "disciplined", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "diligent", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "methodical", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "rushed", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "sloppy", "reason": "T3A-D3-EXEC-001 v2.0 Section 5.7a retired vocabulary", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "acknowledged", "reason": "cross_dimension_assertion", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "admitted", "reason": "cross_dimension_assertion", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "attributed", "reason": "cross_dimension_assertion", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "blamed", "reason": "cross_dimension_assertion", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "disclosed", "reason": "cross_dimension_assertion", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "informed", "reason": "cross_dimension_assertion", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "notified", "reason": "cross_dimension_assertion", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "told", "reason": "cross_dimension_assertion", "version": "PV-D3-1.0", "created_at": "2026-10-20T20:03:08.868212+00:00", "dimension_id": "D3"}, {"word": "calmly", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "clearly", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "defensively", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "politely", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "abruptly", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "confidently", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "professionally", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "patiently", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "curtly", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "warmly", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "respectfully", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "aggressively", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "hesitantly", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "articulately", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "fluently", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "concisely", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "verbosely", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "directly", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "evasively", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "articulate", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "clear", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "composed", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "confident", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "warm", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "empathetic", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "assertive", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "defensive", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "calm", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "unflappable", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "poised", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "handles", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "will", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "would", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "tends to", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "always", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "never", "reason": "T3A-D4-EXEC-001 v2.2 Section 5.7a retired vocabulary", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "assess", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "assessed", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "assessment", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "BARS", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "Behavioral Evidence Record", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "blamed", "reason": "cross_dimension_assertion", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "caused", "reason": "cross_dimension_assertion", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "checked", "reason": "cross_dimension_assertion", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "escalated", "reason": "cross_dimension_assertion", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "owned", "reason": "cross_dimension_assertion", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "prioritized", "reason": "cross_dimension_assertion", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "sequenced the work", "reason": "cross_dimension_assertion", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "verified", "reason": "cross_dimension_assertion", "version": "PV-D4-1.0", "created_at": "2026-10-20T20:32:37.630315+00:00", "dimension_id": "D4"}, {"word": "behavioral fingerprint", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "candidate", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "certified", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "certify", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "competent", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "disqualification", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "does not support selection, retention, termination or adverse employment action", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "expected response", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "fail", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "grade", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "L1", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "L2", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "L3", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "L4", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "named recipient", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "not yet available for observation", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "observation_level", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "pass", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "proficient", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "rank", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "rated", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "rating", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "red flag", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "redemption passcode", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "release token", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "released to your organization", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "rubric", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "score", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "scoring", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "skill passport", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "strong response", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "tier", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "validate", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}, {"word": "validated", "reason": "D4 Section 4.2 retired vocabulary, closed list", "version": "PV-D4-4.2", "created_at": "2026-10-20T20:32:38.624208+00:00", "dimension_id": "D4"}]$rb$::jsonb) on conflict do nothing;
alter table public."t3a_rce_prohibited_vocabulary" enable trigger user;
CREATE OR REPLACE FUNCTION public.t3a_attempt_sequence()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.participant_id::text || new.dimension_id || new.stage_code::text, 0));
    new.attempt_no := greatest(coalesce(new.attempt_no, 0),
      coalesce((select max(attempt_no) from public.t3a_attempt where participant_id = new.participant_id and dimension_id = new.dimension_id and stage_code = new.stage_code), 0) + 1);
    -- DT-13: a welfare stop consumes no attempt and sets no cooldown.
    if new.attempt_event_class = 'welfare_stop' then new.counted := false; new.cooldown_class := 'none'; end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.attempt_no is distinct from old.attempt_no then
      raise exception 'T3A_ATTEMPT_NO_IMMUTABLE: attempt_no cannot be changed, lowered or reset' using errcode = '42501';
    end if;
    if new.attempt_event_class = 'welfare_stop' then new.counted := false; new.cooldown_class := 'none'; end if;
    return new;
  end if;
  raise exception 'T3A_ATTEMPT_NO_DELETE: attempts are never deleted; the sequence never decreases' using errcode = '42501';
end $function$;
revoke all on function t3a_attempt_sequence() from public, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.t3a_commit_observation(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_stage text := p->>'stage_code'; v_sv uuid := nullif(p->>'source_version_id','')::uuid; v_served uuid := nullif(p->>'served_instance_id','')::uuid;
  v_src_hash text; v_ren_hash text; v_row public.t3a_observation; v_cols text; v_subject text := coalesce(p->>'participant_id', '');
begin
  if v_stage = 'S1' and nullif(p->>'observer_id','') is not null then
    return public.t3a_capture_refuse('observation.commit', 'OBSERVER_NOT_ALLOWED_AT_S1', v_subject, 'S1 records carry confirmer fields, not observer_id');
  end if;
  if v_stage in ('S2', 'S4') and nullif(p->>'observer_id','') is null then
    return public.t3a_capture_refuse('observation.commit', 'OBSERVER_REQUIRED', v_subject, v_stage || ' records need observer_id');
  end if;
  select source_version_hash into v_src_hash from public.t3a_source_version where source_version_id = v_sv;
  select r.rendered_instance_hash into v_ren_hash from public.t3a_served_instance s join public.t3a_rendered_instance r on r.rendered_instance_id = s.rendered_instance_id where s.served_instance_id = v_served;
  if v_src_hash is null or v_ren_hash is null then
    return public.t3a_capture_refuse('observation.commit', 'DUAL_HASH_MISSING', v_subject, 'both the source version hash and the rendered instance hash are required');
  end if;
  -- Only the columns the caller named are inserted, so column defaults (created_at, ids) still apply.
  select string_agg(format('%I', a.attname), ', ') into v_cols from pg_attribute a
   where a.attrelid = 'public.t3a_observation'::regclass and a.attnum > 0 and not a.attisdropped and p ? a.attname::text;
  execute format('insert into public.t3a_observation (%1$s) select %1$s from jsonb_populate_record(null::public.t3a_observation, $1) returning *', v_cols) into v_row using p;
  return jsonb_build_object('outcome', 'committed', 'observation_id', v_row.observation_id, 'source_version_hash', v_src_hash, 'rendered_instance_hash', v_ren_hash);
end $function$;
revoke all on function t3a_commit_observation(jsonb) from public, anon, authenticated, service_role;
grant execute on function t3a_commit_observation(jsonb) to service_role;
CREATE OR REPLACE FUNCTION public.t3a_cooldown_status(p_participant uuid, p_dimension text, p_stage t3a_stage_code)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_counted_attempts int;
  v_last_completed timestamptz;
  v_cooldown_days int := 7;
  v_max_attempts int := 3;
BEGIN
  SELECT count(*), max(ended_at)
    INTO v_counted_attempts, v_last_completed
    FROM public.t3a_attempt
   WHERE participant_id = p_participant
     AND dimension_id = p_dimension
     AND stage_code = p_stage
     AND counted = true;

  IF v_counted_attempts >= v_max_attempts THEN
    RETURN 'ATTEMPTS_EXCEEDED';
  END IF;

  IF v_last_completed IS NOT NULL
     AND v_last_completed + (v_cooldown_days || ' days')::interval > now() THEN
    RETURN 'ON_COOLDOWN(until=' || to_char(v_last_completed + (v_cooldown_days || ' days')::interval, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') || ')';
  END IF;

  RETURN 'AVAILABLE';
END
$function$;
revoke all on function t3a_cooldown_status(uuid,text,t3a_stage_code) from public, anon, authenticated, service_role;
grant execute on function t3a_cooldown_status(uuid,text,t3a_stage_code) to public;
grant execute on function t3a_cooldown_status(uuid,text,t3a_stage_code) to authenticated;
CREATE OR REPLACE FUNCTION public.t3a_current_composed(p_participant uuid, p_dimension text)
 RETURNS TABLE(composed_statement_id uuid, observation_ref uuid, stage_code text, source_version_id uuid, observer_id uuid, clause_instances jsonb, conditions jsonb, composed_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select cs.composed_statement_id, cs.observation_ref, cs.stage_code, cs.source_version_id, o.observer_id, cs.clause_instances, cs.conditions, cs.composed_at
    from public.t3a_dimension_composed_statement cs join public.t3a_observation_record o on o.observation_record_id = cs.observation_ref
   where cs.participant_id = p_participant and cs.dimension_id = p_dimension and o.dimension_id = p_dimension and o.is_committed is true and not cs.test_mode
     and not exists (select 1 from public.t3a_dimension_composed_statement n where n.supersedes_composed_statement_id = cs.composed_statement_id)
     and not exists (select 1 from public.t3a_dimension_statement_withdrawal w where w.composed_statement_id = cs.composed_statement_id)
$function$;
revoke all on function t3a_current_composed(uuid,text) from public, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.t3a_d1_next_attempt_permitted(p_participant_id uuid, p_dimension_id text, p_stage_code t3a_stage_code)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_completed  int;
  v_last_end   timestamptz;
  v_wait       int;
  v_has_wait   boolean;
  v_available  timestamptz;
  v_welfare    timestamptz;
BEGIN
  SELECT count(*), max(a.ended_at) INTO v_completed, v_last_end
    FROM public.t3a_attempt a
   WHERE a.participant_id = p_participant_id
     AND a.dimension_id = p_dimension_id
     AND a.stage_code = p_stage_code
     AND a.outcome = 'completed'
     AND a.counted;

  -- AC-B1: the attempt cap of three. Read from CX-27's own table: the row
  -- for three completed observations carries no wait BECAUSE there is no
  -- fourth attempt, and reading its NULL as "no wait" is the mistake this
  -- guards against.
  IF v_completed >= 3 THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'ATTEMPT_CAP_REACHED',
      'completed_observations', v_completed,
      'remedy', 'CX-27: there is no cooldown after the third completed observation because there is no fourth attempt.');
  END IF;

  IF v_completed >= 1 THEN
    SELECT c.wait_days, (c.wait_days IS NOT NULL) INTO v_wait, v_has_wait
      FROM public.t3a_d1_specification_cooldown c
     WHERE c.completed_observations = v_completed AND c.dimension_id = p_dimension_id;

    IF NOT coalesce(v_has_wait, false) THEN
      RETURN jsonb_build_object('permitted', false,
        'refusal_code', 'NO_COOLDOWN_ISSUED_FOR_THIS_COUNT',
        'completed_observations', v_completed,
        'remedy', 'CX-27 issues a wait for one and two completed observations. A count with no issued wait is held rather than allowed through.');
    END IF;

    IF v_last_end IS NULL THEN
      RETURN jsonb_build_object('permitted', false,
        'refusal_code', 'COMPLETED_ATTEMPT_HAS_NO_END_TIME',
        'remedy', 'The cooldown counts from the end of the completed observation. Without that instant there is nothing to count from, and guessing one would shorten a wait.');
    END IF;

    v_available := v_last_end + make_interval(days => v_wait);
    IF now() < v_available THEN
      RETURN jsonb_build_object('permitted', false,
        'refusal_code', 'SPECIFICATION_COOLDOWN_IN_FORCE',
        'completed_observations', v_completed,
        'wait_days', v_wait,
        'available_from', v_available);
    END IF;
  END IF;

  -- CX-28. A welfare stop consumes no attempt, so none of the above sees it,
  -- and "the rescheduling cooldown applies" — whose duration this instrument
  -- does not give. Held rather than guessed.
  SELECT max(w.recorded_at) INTO v_welfare
    FROM public.t3a_d1_welfare_withdrawal w
    JOIN public.t3a_attempt a ON a.attempt_id = w.attempt_id
   WHERE a.participant_id = p_participant_id
     AND a.dimension_id = p_dimension_id
     AND a.stage_code = p_stage_code;

  IF v_welfare IS NOT NULL THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'RESCHEDULING_COOLDOWN_DURATION_NOT_ISSUED',
      'welfare_stop_at', v_welfare,
      'remedy', 'CX-28 says a welfare stop consumes no attempt and that the rescheduling cooldown applies. Its duration is named nowhere in this instrument, so the build does not supply one. The participant is held until the founder issues it — which is also the protective reading, because the point of a wait after distress is not to be re-observed straight away.');
  END IF;

  RETURN jsonb_build_object('permitted', true,
    'completed_observations', v_completed);
END;
$function$;
revoke all on function t3a_d1_next_attempt_permitted(uuid,text,t3a_stage_code) from public, anon, authenticated, service_role;
grant execute on function t3a_d1_next_attempt_permitted(uuid,text,t3a_stage_code) to public;
grant execute on function t3a_d1_next_attempt_permitted(uuid,text,t3a_stage_code) to authenticated;
CREATE OR REPLACE FUNCTION public.t3a_evidence_state(p_participant uuid, p_dimension text, p_include_test boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  n int; state text := 'not_observed'; frame text := 'FR-' || p_dimension || '-0';
  stages text[]; mentors uuid[]; related boolean; all_s1 boolean;
  conds text[] := '{}'; blocked jsonb := '[]'::jsonb; rec jsonb := '[]'::jsonb; ordered jsonb;
  locked boolean; keyed record; codes text[]; has_blocker boolean; n_stage int; n_ctx int; n_ci int; reasons text[]; contexts uuid[]; x uuid; y uuid; pair_ok boolean;
begin
  select count(*) into n from public.t3a_es_obs(p_participant, p_dimension, p_include_test);
  if n = 0 then
    return jsonb_build_object('dimension_id', p_dimension, 'state', state, 'frame', frame, 'observations', 0, 'conditions', '[]'::jsonb, 'recurrence', '[]'::jsonb, 'blocked', '[]'::jsonb);
  end if;
  state := 'observed_once'; frame := 'FR-' || p_dimension || '-1';
  select array_agg(distinct stage), array_agg(distinct observer) filter (where stage in ('S2', 'S3', 'S4') and observer is not null), bool_and(stage = 'S1')
    into stages, mentors, all_s1 from public.t3a_es_obs(p_participant, p_dimension, p_include_test);

  -- breadth: two or more observations in approved distinct contexts, with Stage and observer diversity
  select exists (select 1 from public.t3a_es_obs(p_participant, p_dimension, p_include_test) a join public.t3a_es_obs(p_participant, p_dimension, p_include_test) b
                  on a.cid < b.cid where not a.tnc and not b.tnc and public.t3a_contexts_related(p_dimension, a.src, b.src)) into related;
  if n > 1 and not related then blocked := blocked || jsonb_build_object('frame', 'multiple_contexts', 'reason', 'no_approved_cross_context_relationship'); end if;
  if related then
    if coalesce(array_length(stages, 1), 0) >= 2 and coalesce(array_length(mentors, 1), 0) >= 2 then
      state := 'observed_multiple_contexts'; frame := 'FR-' || p_dimension || '-2';
    else
      blocked := blocked || jsonb_build_object('frame', 'multiple_contexts', 'reason', 'stage_or_observer_diversity_absent');
    end if;
  end if;

  -- recurrence, clause by clause: gather the FULL current set for the key, test for material contradiction FIRST, then the threshold
  select configuration_value = 'locked' into locked from public.t3a_configuration_value where configuration_key = 'recurrence_config_locked' order by configuration_seq desc limit 1;
  for keyed in select distinct c ->> 'recurrence_equivalence_key_id' as k from public.t3a_es_obs(p_participant, p_dimension, p_include_test) o, jsonb_array_elements(o.ci) c where not o.tnc loop
    select array_agg(distinct c ->> 'state_code'), bool_or((c ->> 'recurrence_blocker')::boolean), count(distinct o.stage), count(distinct o.src), count(*)
      into codes, has_blocker, n_stage, n_ctx, n_ci
      from public.t3a_es_obs(p_participant, p_dimension, p_include_test) o, jsonb_array_elements(o.ci) c where c ->> 'recurrence_equivalence_key_id' = keyed.k and not o.tnc;
    reasons := '{}';
    if cardinality(codes) > 1 then
      reasons := reasons || 'material_contradiction_in_current_set'::text;   -- same key, differing state codes: a key groups the states of one variable and does not assert one conduct
    else
      if n_ci < 3 then reasons := reasons || 'fewer_than_three_qualifying_observations'::text; end if;
      if n_stage < 3 then reasons := reasons || 'fewer_than_three_distinct_stages'::text; end if;
      if n_ctx < 3 then reasons := reasons || 'fewer_than_three_contexts'::text; end if;
      if coalesce(has_blocker, false) then reasons := reasons || 'recurrence_blocker_statement'::text; end if;
      if coalesce(array_length(mentors, 1), 0) < 2 then reasons := reasons || 'fewer_than_two_authorized_observers'::text; end if;
      if not coalesce(locked, false) then reasons := reasons || 'recurrence_configuration_not_locked'::text; end if;
      if cardinality(reasons) = 0 then
        select array_agg(distinct o.src) into contexts from public.t3a_es_obs(p_participant, p_dimension, p_include_test) o, jsonb_array_elements(o.ci) c where c ->> 'recurrence_equivalence_key_id' = keyed.k and not o.tnc;
        pair_ok := true;
        foreach x in array contexts loop foreach y in array contexts loop
          if x < y and not public.t3a_contexts_related(p_dimension, x, y) then pair_ok := false; end if;
        end loop; end loop;
        if not pair_ok then reasons := reasons || 'contexts_not_approved_distinct'::text; end if;
      end if;
    end if;
    if cardinality(reasons) = 0 then
      rec := rec || jsonb_build_object('recurrence_equivalence_key_id', keyed.k, 'state_code', codes[1], 'available', true);
      state := 'recurring_across_stages'; frame := 'FR-' || p_dimension || '-3';
    else
      rec := rec || jsonb_build_object('recurrence_equivalence_key_id', keyed.k, 'available', false, 'reasons', to_jsonb(reasons));
      if 'material_contradiction_in_current_set' = any (reasons) then conds := conds || 'mixed_or_divergent'::text; end if;
    end if;
  end loop;

  -- cross-cutting conditions, in the fixed precedence of 5.13 (limitation first)
  if exists (select 1 from public.t3a_es_obs(p_participant, p_dimension, p_include_test) o where o.conds ? 'conditions_compromised') then conds := conds || 'conditions_compromised'::text; end if;
  if all_s1 then conds := conds || 'stage_1_only'::text; end if;
  conds := conds || (case when coalesce(array_length(mentors, 1), 0) >= 2 then 'multiple_observers' else 'single_observer' end);
  if exists (select 1 from public.t3a_es_obs(p_participant, p_dimension, p_include_test) a join public.t3a_es_obs(p_participant, p_dimension, p_include_test) b
              on a.cid < b.cid and a.stage = b.stage and a.src = b.src and a.ci::text <> b.ci::text) then conds := conds || 'earlier_attempt_differs'::text; end if;
  select coalesce(jsonb_agg(c order by p), '[]'::jsonb) into ordered from (
    select distinct c, case c when 'conditions_compromised' then 1 when 'evidence_expired' then 2 when 'correction_open' then 3 when 'amendment_or_withdrawal' then 4 when 'stage_1_only' then 5
      when 'single_observer' then 6 when 'multiple_observers' then 6 when 'mixed_or_divergent' then 7 when 'earlier_attempt_differs' then 8 else 9 end p from unnest(conds) c) z;
  return jsonb_build_object('dimension_id', p_dimension, 'state', state, 'frame', frame, 'observations', n, 'conditions', ordered, 'recurrence', rec, 'blocked', blocked);
end $function$;
revoke all on function t3a_evidence_state(uuid,text,boolean) from public, anon, authenticated, service_role;
grant execute on function t3a_evidence_state(uuid,text,boolean) to service_role;
CREATE OR REPLACE FUNCTION public.t3a_involvement_test(p_actor_id uuid, p_observation_record_id uuid, p_requested_authority t3a_authority)
 RETURNS t3a_involvement_reason
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_record public.t3a_observation_record%rowtype;
BEGIN
  SELECT * INTO v_record FROM public.t3a_observation_record WHERE observation_record_id = p_observation_record_id;
  IF NOT FOUND THEN RETURN 'INVOLVEMENT_TEST_HARD_BLOCK'; END IF;

  IF p_requested_authority = 'reconsider' AND v_record.observer_id = p_actor_id THEN
    RETURN 'PRIOR_OBSERVER_OF_RECORD';
  END IF;
  IF p_requested_authority = 'reconsider' AND v_record.confirmer_id = p_actor_id THEN
    RETURN 'PRIOR_CONFIRMER_OF_RECORD';
  END IF;
  IF p_requested_authority = 'reconsider' AND EXISTS (
    SELECT 1 FROM public.t3a_reconsideration_assignment ra
     WHERE ra.observation_record_id = p_observation_record_id
       AND ra.reconsiderer_id = p_actor_id
  ) THEN
    RETURN 'PRIOR_RECONSIDERER_OF_RECORD';
  END IF;
  IF p_requested_authority IN ('confirm','record_progression','evidence_review','issue','reconsider')
     AND v_record.observer_id = p_actor_id THEN
    RETURN 'PRIOR_OBSERVER_OF_RECORD';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.t3a_d1_conflict_declaration
     WHERE actor_id = p_actor_id
       AND target_kind = 'participant'
       AND target_ref = v_record.participant_id::text
       AND revoked_at IS NULL
  ) THEN
    RETURN 'DECLARED_CONFLICT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.t3a_role_authorization ra
     WHERE ra.actor_id = p_actor_id
       AND ra.authority = p_requested_authority
       AND ra.status = 'granted'
       AND (ra.dimension_id IS NULL OR ra.dimension_id = v_record.dimension_id)
       AND (ra.stage_codes = '{}'::text[] OR v_record.stage_code = ANY (ra.stage_codes))
       AND (ra.effective_to IS NULL OR ra.effective_to > now())
  ) THEN
    RETURN 'INSUFFICIENT_AUTHORIZATION';
  END IF;

  RETURN 'ELIGIBLE';
END $function$;
revoke all on function t3a_involvement_test(uuid,uuid,t3a_authority) from public, anon, authenticated, service_role;
grant execute on function t3a_involvement_test(uuid,uuid,t3a_authority) to public;
grant execute on function t3a_involvement_test(uuid,uuid,t3a_authority) to authenticated;
CREATE OR REPLACE FUNCTION public.t3a_issuer_not_reviewer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if exists (select 1 from public.t3a_d1_report_issuance i where i.ber_report_id = new.ber_report_id and i.issued_by = new.reviewer_id) then
    raise exception 'REVIEWER_IS_ISSUER: the issuer of this report cannot also be its reviewer' using errcode = '42501';
  end if;
  return new;
end $function$;
revoke all on function t3a_issuer_not_reviewer() from public, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.t3a_open_s1_output(p_stage_instance uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.t3a_stage_sequence;
begin
  select * into v from public.t3a_stage_sequence where stage_instance_id = p_stage_instance;
  if not found or v.s2_determinations_locked_at is null then
    return public.t3a_capture_refuse('s1_output.open', 'S2_DETERMINATIONS_NOT_LOCKED', p_stage_instance::text, 'the S1 output opens only after the S2 determinations are locked');
  end if;
  if v.s1_output_unmasked_at is null then
    update public.t3a_stage_sequence set s1_output_unmasked_at = now() where stage_instance_id = p_stage_instance;
  end if;
  return jsonb_build_object('outcome', 'opened', 's1_output_unmasked_at', (select s1_output_unmasked_at from public.t3a_stage_sequence where stage_instance_id = p_stage_instance));
end $function$;
revoke all on function t3a_open_s1_output(uuid) from public, anon, authenticated, service_role;
grant execute on function t3a_open_s1_output(uuid) to authenticated;
grant execute on function t3a_open_s1_output(uuid) to service_role;
CREATE OR REPLACE FUNCTION public.t3a_open_stage_entry(p_participant uuid, p_dimension text, p_stage t3a_stage_code, p_source_version_id uuid DEFAULT NULL::uuid, p_randomization_seed bigint DEFAULT NULL::bigint, p_presentation_variant_seed bigint DEFAULT NULL::bigint)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_env public.t3a_env_state := public.t3a_current_env_state();
  v_identity text := public.t3a_registration_identity_policy();
  v_cooldown text;
  v_stage_instance uuid;
  v_gateway uuid;
  v_stage_entry uuid;
BEGIN
  IF p_participant IS NULL OR p_dimension IS NULL OR p_stage IS NULL THEN
    RAISE EXCEPTION 'STAGE_ENTRY_MISSING_ARGS';
  END IF;

  -- Environment gate.
  IF v_env = 'design_only' OR v_env = 'observation_capable_inactive' THEN
    RAISE EXCEPTION 'ENV_CAPABILITY: environment (%) does not accept real Stage entry', v_env;
  END IF;

  -- Identity assurance.
  IF v_env IN ('pilot_active','production_active') AND v_identity <> 'AVAILABLE' THEN
    RAISE EXCEPTION 'IDENTITY_ASSURANCE_REQUIRED: real Stage entry cannot proceed';
  END IF;

  -- Attempt / cooldown.
  v_cooldown := public.t3a_cooldown_status(p_participant, p_dimension, p_stage);
  IF v_cooldown = 'ATTEMPTS_EXCEEDED' THEN
    RAISE EXCEPTION 'ATTEMPTS_EXCEEDED';
  ELSIF v_cooldown LIKE 'ON_COOLDOWN%' THEN
    RAISE EXCEPTION 'ON_COOLDOWN: %', v_cooldown;
  END IF;

  -- Source servability.
  IF p_source_version_id IS NOT NULL
     AND NOT public.t3a_content_is_servable(p_source_version_id) THEN
    RAISE EXCEPTION 'CONTENT_INACTIVE_OR_UNAPPROVED';
  END IF;

  -- Stage instance. One per (participant, dimension, stage, attempt).
  SELECT stage_instance_id
    INTO v_stage_instance
    FROM public.t3a_stage_instance
   WHERE participant_id = p_participant
     AND dimension_id   = p_dimension::public.t3a_dimension_code
     AND stage_code     = p_stage
     AND state IN ('eligible','scheduled','active')
   ORDER BY attempt_no DESC
   LIMIT 1;

  IF v_stage_instance IS NULL THEN
    INSERT INTO public.t3a_stage_instance (
      participant_id, stage_code, dimension_id, attempt_no, state
    ) VALUES (
      p_participant, p_stage, p_dimension::public.t3a_dimension_code, 1, 'active'
    ) RETURNING stage_instance_id INTO v_stage_instance;
  ELSE
    UPDATE public.t3a_stage_instance
       SET state = 'active', activated_at = coalesce(activated_at, now())
     WHERE stage_instance_id = v_stage_instance;
  END IF;

  -- Observation path gateway.
  INSERT INTO public.t3a_observation_path_gateway (
    participant_id, session_identity_method, observation_consent_version,
    assistance_rules_version, coaching_terminated_at
  ) VALUES (
    p_participant, 'participant_self_attestation', 'v1.0', 'v1.0', now()
  ) RETURNING observation_path_gateway_id INTO v_gateway;

  -- Stage entry event.
  INSERT INTO public.t3a_stage_entry_event (
    observation_path_gateway_id, stage_instance_id, stage_code,
    dimensions_in_play, session_identity, assistance_rules_version,
    participant_id, dimension_id, source_version_id,
    randomization_seed, presentation_variant_seed,
    env_state_at_entry, session_identity_receipt_id
  ) VALUES (
    v_gateway, v_stage_instance, p_stage,
    ARRAY[p_dimension::public.t3a_dimension_code],
    'participant_self_attestation', 'v1.0',
    p_participant, p_dimension, p_source_version_id,
    coalesce(p_randomization_seed, (extract(epoch from clock_timestamp())*1000)::bigint),
    coalesce(p_presentation_variant_seed, (extract(epoch from clock_timestamp())*997)::bigint),
    v_env, 'stub-receipt'
  ) RETURNING stage_entry_event_id INTO v_stage_entry;

  -- Attempt row.
  INSERT INTO public.t3a_attempt (
    participant_id, dimension_id, stage_code, stage_entry_event_id
  ) VALUES (
    p_participant, p_dimension, p_stage, v_stage_entry
  );

  RETURN v_stage_entry;
END
$function$;
revoke all on function t3a_open_stage_entry(uuid,text,t3a_stage_code,uuid,bigint,bigint) from public, anon, authenticated, service_role;
grant execute on function t3a_open_stage_entry(uuid,text,t3a_stage_code,uuid,bigint,bigint) to public;
grant execute on function t3a_open_stage_entry(uuid,text,t3a_stage_code,uuid,bigint,bigint) to authenticated;
CREATE OR REPLACE FUNCTION public.t3a_prior_exposure(p_participant uuid, p_source_version uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.t3a_d1_content_version; o public.t3a_content_object; stage text; form text; sc text; ipf text; dim text; reasons text[] := '{}';
begin
  select * into v from public.t3a_d1_content_version where content_version_id = p_source_version;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  dim := o.dimension_id::text; stage := v.body ->> 'stage_code'; form := public.t3a_administration_form_of(stage);
  sc := v.body -> 'source_sheet' ->> (lower(dim) || '_situation_class');
  select interaction_pattern_family_id into ipf from public.t3a_interaction_pattern_family where dimension_id = dim and situation_class = sc;
  if exists (select 1 from public.t3a_stage_entry_event s where s.participant_id = p_participant and s.source_version_id = p_source_version) then reasons := reasons || 'source_version_met'::text; end if;
  if exists (select 1 from public.t3a_stage_entry_event s join public.t3a_d1_content_version pv on pv.content_version_id = s.source_version_id
              where s.participant_id = p_participant and public.t3a_administration_form_of(pv.body ->> 'stage_code') = form) then reasons := reasons || 'administration_form_met'::text; end if;
  if ipf is not null and exists (select 1 from public.t3a_stage_entry_event s join public.t3a_d1_content_version pv on pv.content_version_id = s.source_version_id join public.t3a_content_object po on po.content_object_id = pv.content_object_id
              join public.t3a_interaction_pattern_family pf on pf.dimension_id = po.dimension_id::text and pf.situation_class = pv.body -> 'source_sheet' ->> (lower(po.dimension_id::text) || '_situation_class')
              where s.participant_id = p_participant and po.dimension_id::text = dim and pf.interaction_pattern_family_id = ipf) then reasons := reasons || 'pattern_family_met'::text; end if;
  return jsonb_build_object('excluded', cardinality(reasons) > 0, 'reasons', to_jsonb(reasons), 'administration_form_id', form, 'interaction_pattern_family_id', ipf);
end $function$;
revoke all on function t3a_prior_exposure(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function t3a_prior_exposure(uuid,uuid) to authenticated;
grant execute on function t3a_prior_exposure(uuid,uuid) to service_role;
CREATE OR REPLACE FUNCTION public.t3a_rce_prohibited_vocabulary_scan(p_body text, p_dimension_id text, p_version text DEFAULT 'PV-D1-1.0'::text)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(word ORDER BY word), ARRAY[]::text[])
  FROM public.t3a_rce_prohibited_vocabulary
  WHERE dimension_id = p_dimension_id AND version = p_version
    AND p_body ~* ('(^|[^[:alnum:]_])' || regexp_replace(word, '([.()^$|[\]\\+?*{}])', '\\\1', 'g') || '([^[:alnum:]_]|$)');
$function$;
revoke all on function t3a_rce_prohibited_vocabulary_scan(text,text,text) from public, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.t3a_rce_render_check(p_ber_report_id uuid, p_output_mode text, p_pilot_authorization_id uuid DEFAULT NULL::uuid, p_controlled_text_version text DEFAULT 'CTR-1.0'::text, p_prohibited_vocabulary_version text DEFAULT 'PV-D1-1.0'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r public.t3a_d1_ber_report;
  v_release_state text;
  v_live_digest text;
  v_sealed_digest text;
  v_hits text[];
  v_rec record;
  v_bad_disposition text;
BEGIN
  -- Table 51.1 — manifest invariants
  IF p_output_mode NOT IN ('issued','demonstration','pilot') THEN
    RETURN jsonb_build_object('ok', false,
      'refusal_code','render_input_invalid',
      'detail', format('unknown output_mode %L', p_output_mode));
  END IF;

  -- Table 51.2 — pilot authorization condition
  IF p_output_mode = 'pilot' AND p_pilot_authorization_id IS NULL THEN
    RETURN jsonb_build_object('ok', false,
      'refusal_code','output_mode_invalid',
      'detail','pilot output without an authorization');
  END IF;
  IF p_output_mode <> 'pilot' AND p_pilot_authorization_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false,
      'refusal_code','output_mode_invalid',
      'detail', format('%s output carrying a pilot authorization', p_output_mode));
  END IF;
  IF p_output_mode = 'pilot' AND NOT public.t3a_rce_pilot_authorization_is_live(p_pilot_authorization_id) THEN
    RETURN jsonb_build_object('ok', false,
      'refusal_code','pilot_authorization_not_live',
      'detail','authorization is revoked or expired');
  END IF;

  SELECT * INTO r FROM public.t3a_d1_ber_report WHERE ber_report_id = p_ber_report_id;
  IF r.ber_report_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal_code','ber_report_not_found');
  END IF;

  -- Derive release_state from BER status.
  v_release_state := CASE r.status
    WHEN 'issued'          THEN 'released'
    WHEN 'amended'         THEN 'released'
    WHEN 'ready_to_issue'  THEN 'released'
    WHEN 'participant_review' THEN 'draft'
    WHEN 'challenge_open'  THEN 'in_correction'
    WHEN 'withdrawn'       THEN 'withdrawn'
    ELSE 'draft'
  END;

  -- Table 53.1 — output eligibility matrix
  IF v_release_state = 'withdrawn' THEN
    RETURN jsonb_build_object('ok', false,
      'refusal_code','output_mode_ineligible',
      'detail','withdrawn version is not eligible for any serve');
  END IF;
  IF v_release_state IN ('draft','in_correction','superseded') AND p_output_mode <> 'demonstration' THEN
    RETURN jsonb_build_object('ok', false,
      'refusal_code','output_mode_ineligible',
      'detail', format('%s output from a %s version', p_output_mode, v_release_state));
  END IF;

  -- Table 61.3 — controlled text digest check
  v_sealed_digest := (SELECT sha256_digest FROM public.t3a_rce_controlled_text_register WHERE version = p_controlled_text_version);
  IF v_sealed_digest IS NOT NULL THEN
    v_live_digest := public.t3a_rce_controlled_text_live_digest(p_controlled_text_version);
    IF v_live_digest IS DISTINCT FROM v_sealed_digest THEN
      RETURN jsonb_build_object('ok', false,
        'refusal_code','controlled_text_divergence',
        'detail', format('live digest for %s does not match the sealed register', p_controlled_text_version),
        'sealed_digest', v_sealed_digest,
        'live_digest', v_live_digest);
    END IF;
  END IF;

  -- Table 60.4 — use disposition gate on each composed statement
  FOR v_rec IN
    SELECT cs.composed_body, sl.statement_key, sl.use_disposition, o.dimension_id
    FROM public.t3a_d1_composed_statement cs
    JOIN public.t3a_observation_record o ON o.observation_record_id = cs.observation_record_id
    JOIN public.t3a_d1_statement_library sl ON sl.statement_library_id = cs.statement_library_id
    WHERE o.participant_id = r.participant_id
      AND o.dimension_id   = r.dimension_id
      AND o.is_committed
      AND NOT EXISTS (SELECT 1 FROM public.t3a_d1_composed_statement later WHERE later.supersedes = cs.composed_statement_id)
  LOOP
    v_bad_disposition := NULL;
    IF p_output_mode = 'issued' AND v_rec.use_disposition <> 'production' THEN
      v_bad_disposition := v_rec.use_disposition;
    ELSIF p_output_mode = 'pilot' AND v_rec.use_disposition IN ('calibration_restricted','consequential_use_suspended') THEN
      v_bad_disposition := v_rec.use_disposition;
    END IF;
    IF v_bad_disposition IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false,
        'refusal_code','entry_use_disposition_refused',
        'detail', format('entry %s is %s and may not be served under %s',
                          v_rec.statement_key, v_bad_disposition, p_output_mode),
        'entry_id', v_rec.statement_key,
        'use_disposition', v_bad_disposition);
    END IF;

    -- §34 prohibited vocabulary scan on the composed body
    v_hits := public.t3a_rce_prohibited_vocabulary_scan(v_rec.composed_body, v_rec.dimension_id, p_prohibited_vocabulary_version);
    IF cardinality(v_hits) > 0 THEN
      RETURN jsonb_build_object('ok', false,
        'refusal_code','prohibited_vocabulary_hit',
        'detail', format('entry %s carries words forbidden under %s: %s',
                          v_rec.statement_key, p_prohibited_vocabulary_version, array_to_string(v_hits, ', ')),
        'entry_id', v_rec.statement_key,
        'hit_words', v_hits);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true,
    'release_state', v_release_state,
    'output_mode', p_output_mode,
    'controlled_text_version', p_controlled_text_version,
    'prohibited_vocabulary_version', p_prohibited_vocabulary_version);
END; $function$;
revoke all on function t3a_rce_render_check(uuid,text,uuid,text,text) from public, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.t3a_record_progression_decision(p_stage_instance_id uuid, p_dimension_id t3a_dimension_code, p_decision t3a_progression_decision, p_rationale text DEFAULT NULL::text, p_rationale_code text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_stage t3a_stage_code;
  v_participant uuid;
  v_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT t3a_is_mentor() THEN
    PERFORM t3a_raise('§13 recordProgressionDecision',
      'authorized mentor role required');
  END IF;
  -- DT-20: a rationale is a controlled code, never free text. No code list is loaded yet, so the code is optional and its capture state is
  -- not_authored (package 2.5.25); the route stays open without it.
  IF p_rationale IS NOT NULL AND length(btrim(p_rationale)) > 0 THEN
    PERFORM t3a_raise('DT-20 FREE_TEXT_REFUSED',
      'a progression decision takes a controlled rationale code, not free text');
  END IF;
  IF p_rationale_code IS NOT NULL AND p_rationale_code !~ '^[A-Za-z0-9_.:-]{1,64}$' THEN
    PERFORM t3a_raise('DT-20 FREE_TEXT_REFUSED', 'rationale code must be a code');
  END IF;

  SELECT stage_code, participant_id
    INTO v_stage, v_participant
    FROM t3a_stage_instance
    WHERE stage_instance_id = p_stage_instance_id;

  IF v_stage IS NULL THEN
    PERFORM t3a_raise('§13', 'stage_instance not found');
  END IF;

  -- AC-59: cannot record a progression decision for an S1 instance
  -- that has not been confirmed.
  IF v_stage = 'S1' AND NOT EXISTS (
    SELECT 1 FROM t3a_mentor_judgment
      WHERE stage_instance_id = p_stage_instance_id
        AND human_confirmation_actor_id IS NOT NULL
  ) THEN
    PERFORM t3a_raise('AC-59',
      'S1 instance has no confirmation; progression decision refused');
  END IF;

  INSERT INTO t3a_mentor_judgment (
    stage_instance_id,
    progression_decision, progression_dimension_id
  ) VALUES (
    p_stage_instance_id,
    p_decision, p_dimension_id
  ) RETURNING mentor_judgment_id INTO v_id;

  -- Redirect holds the next Stage; Pause suspends observation on the
  -- dimension.  State transitions per §11.
  IF p_decision = 'redirect' THEN
    UPDATE t3a_stage_instance
       SET state = 'redirected'
     WHERE stage_instance_id = p_stage_instance_id;
  ELSIF p_decision = 'pause' THEN
    UPDATE t3a_stage_instance
       SET state = 'paused'
     WHERE stage_instance_id = p_stage_instance_id;
  ELSIF p_decision = 'proceed' THEN
    UPDATE t3a_stage_instance
       SET state = 'completed', completed_at = now()
     WHERE stage_instance_id = p_stage_instance_id
       AND state IN ('active', 'scheduled', 'eligible');
  END IF;

  -- Canonical event (observation.progression_recorded).
  PERFORM public.t3a_emit_event(
    'observation.progression_recorded', 'MENTOR', v_actor::text, 'mentor',
    'observation', p_stage_instance_id,
    jsonb_build_object(
      'progression_decision_id', v_id,
      'decision', p_decision,
      'decided_by', v_actor,
      'decided_at', to_jsonb(now())
    ) || CASE WHEN p_rationale_code IS NOT NULL THEN jsonb_build_object('decision_rationale_code', p_rationale_code) ELSE '{}'::jsonb END,
    'progression:' || v_id::text, NULL, v_participant);

  RETURN v_id;
END;
$function$;
revoke all on function t3a_record_progression_decision(uuid,t3a_dimension_code,t3a_progression_decision,text,text) from public, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.t3a_report_actor_gate(p_actor uuid, p_ber_report_id uuid, p_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare b public.t3a_d1_ber_report; why text; dims text[];
begin
  if p_role not in ('evidence_review', 'issue') then return public.t3a_capture_refuse('report.actor', 'role_unknown', p_actor::text, p_role); end if;
  select * into b from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if b.ber_report_id is null then return public.t3a_capture_refuse('report.actor', 'BER_REPORT_NOT_FOUND', p_actor::text, p_ber_report_id::text); end if;
  dims := coalesce(b.represented_dimension_ids, array[b.dimension_id::text]);
  if b.participant_id = p_actor then return public.t3a_capture_refuse('report.actor', 'participant_cannot_review_or_issue_own_report', p_actor::text, p_role); end if;
  why := public.t3a_report_involved(p_actor, b.participant_id, dims);
  -- the reviewer of a report never issues it; evidence review is itself an involving act, so only check it for the issue role
  if p_role = 'issue' and exists (select 1 from public.t3a_evidence_review er where er.ber_report_id = p_ber_report_id and er.reviewer_id = p_actor) then
    return public.t3a_capture_refuse('report.actor', 'reviewer_cannot_issue', p_actor::text, 'the reviewer of this report may not issue it');
  end if;
  if why is not null and not (p_role = 'issue' and why = 'evidence_reviewed') then
    return public.t3a_capture_refuse('report.actor', 'involved_in_report', p_actor::text, p_role || ': actor ' || why || ' a record in this report (all dimensions in it are counted)');
  end if;
  return jsonb_build_object('outcome', 'eligible');
end $function$;
revoke all on function t3a_report_actor_gate(uuid,uuid,text) from public, anon, authenticated, service_role;
grant execute on function t3a_report_actor_gate(uuid,uuid,text) to authenticated;
grant execute on function t3a_report_actor_gate(uuid,uuid,text) to service_role;
CREATE OR REPLACE FUNCTION public.t3a_report_involved(p_actor uuid, p_participant uuid, p_dimensions text[])
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select 'observed' from public.t3a_observation_record o where o.participant_id = p_participant and o.dimension_id = any (p_dimensions) and o.observer_id = p_actor limit 1),
    (select 'confirmed' from public.t3a_observation_record o where o.participant_id = p_participant and o.dimension_id = any (p_dimensions) and o.confirmer_id = p_actor limit 1),
    (select 'progressed' from public.t3a_d1_progression_decision d where d.participant_id = p_participant and d.dimension_id = any (p_dimensions) and d.recorded_by = p_actor limit 1),
    (select 'reconsidered' from public.t3a_reconsideration_assignment ra join public.t3a_observation_record o on o.observation_record_id = ra.observation_record_id
       where o.participant_id = p_participant and o.dimension_id = any (p_dimensions) and ra.reconsiderer_id = p_actor limit 1),
    (select 'evidence_reviewed' from public.t3a_evidence_review er join public.t3a_d1_ber_report b on b.ber_report_id = er.ber_report_id
       where b.participant_id = p_participant and b.represented_dimension_ids && p_dimensions and er.reviewer_id = p_actor limit 1))
$function$;
revoke all on function t3a_report_involved(uuid,uuid,text[]) from public, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.t3a_required_setting(p_key text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v text;
begin
  select configuration_value into v from public.t3a_configuration_value where configuration_key = p_key order by configuration_seq desc limit 1;
  if v is null then select (to_jsonb(c) ->> p_key) into v from public.t3a_deployment_config c where singleton; end if;
  if v is null then
    raise exception 'CONFIGURATION_UNSET: % is not set; this route refuses and does not default', p_key using errcode = '55000';
  end if;
  return v;
end $function$;
revoke all on function t3a_required_setting(text) from public, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.t3a_reviewer_not_issuer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if exists (select 1 from public.t3a_evidence_review r where r.ber_report_id = new.ber_report_id and r.reviewer_id = new.issued_by) then
    raise exception 'REVIEWER_IS_ISSUER: the person who reviewed the evidence for this report cannot issue it' using errcode = '42501';
  end if;
  return new;
end $function$;
revoke all on function t3a_reviewer_not_issuer() from public, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.t3a_s2_entry_needs_s1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.stage_code::text <> 'S2' or not (select enforce_sequence from public.t3a_capture_config) then return new; end if;
  if not exists (select 1 from public.t3a_stage_sequence q where q.participant_id = new.participant_id and q.dimension_id = new.dimension_id
                  and q.s1_outcome_delivered_to_mentor_at is not null) then
    raise exception 'S1_OUTCOME_NOT_DELIVERED: Stage 2 entry waits for the Stage 1 outcome to be delivered to the mentor' using errcode = '42501';
  end if;
  return new;
end $function$;
revoke all on function t3a_s2_entry_needs_s1() from public, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.t3a_s4_compose_session(p_source_version uuid, p_facilitator uuid, p_observed uuid, p_co uuid[], p_accommodation_settled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare gs uuid; m uuid; og jsonb; dim text;
begin
  if not public.t3a_is_service_context() and not public.t3a_has_administrative_standing() then
    return public.t3a_capture_refuse('s4.compose', 'APPROVER_LACKS_STANDING', coalesce(p_observed::text, ''), 'a session is composed by a person with standing or through the service route');
  end if;
  if coalesce(cardinality(p_co), 0) > 3 then return public.t3a_capture_refuse('s4.compose', 'too_many_co_participants', p_observed::text, 'up to three co-participants'); end if;
  if p_observed = p_facilitator or p_facilitator = any (coalesce(p_co, '{}')) or p_observed = any (coalesce(p_co, '{}')) or cardinality(p_co) <> (select count(distinct x) from unnest(p_co) x) then
    return public.t3a_capture_refuse('s4.compose', 'roles_must_be_distinct', p_observed::text, 'the facilitator, the observed participant and each co-participant are different people');
  end if;
  if not coalesce(p_accommodation_settled, false) then return public.t3a_capture_refuse('s4.compose', 'accommodation_not_settled', p_observed::text, 'accommodation needs are settled before composition, never during the session'); end if;
  select o.dimension_id::text into dim from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where v.content_version_id = p_source_version;
  if dim is null then return public.t3a_capture_refuse('s4.compose', 'source_version_not_found', coalesce(p_source_version::text, ''), 'no such version'); end if;
  og := public.t3a_observer_gate(p_facilitator, dim, p_observed);
  if og ->> 'outcome' <> 'authorized' then return og; end if;
  if not public.t3a_pilot_path_open(p_observed, dim, 'new') then
    return public.t3a_capture_refuse('s4.compose', 'pilot_path_stopped', p_observed::text, 'a pilot stop is in force');
  end if;
  insert into public.t3a_d1_group_session(source_version_id, facilitator_id, observed_participant_id, accommodation_settled) values (p_source_version, p_facilitator, p_observed, true) returning group_session_id into gs;
  insert into public.t3a_d1_group_session_member(group_session_id, participant_id, member_role) values (gs, p_observed, 'observed');
  foreach m in array coalesce(p_co, '{}') loop
    insert into public.t3a_d1_group_session_member(group_session_id, participant_id, member_role) values (gs, m, 'co_participant');
  end loop;
  return jsonb_build_object('outcome', 'composed', 'group_session_id', gs, 'observation_records_to_be_written', 1);
end $function$;
revoke all on function t3a_s4_compose_session(uuid,uuid,uuid,uuid[],boolean) from public, anon, authenticated, service_role;
grant execute on function t3a_s4_compose_session(uuid,uuid,uuid,uuid[],boolean) to authenticated;
grant execute on function t3a_s4_compose_session(uuid,uuid,uuid,uuid[],boolean) to service_role;
drop table if exists public."t3a_act_sequence" cascade;
drop table if exists public."t3a_attempt_callback" cascade;
drop table if exists public."t3a_attempt_ending_map" cascade;
drop table if exists public."t3a_attempt_request" cascade;
drop table if exists public."t3a_attempt_rule" cascade;
drop table if exists public."t3a_attempt_unclassified" cascade;
drop table if exists public."t3a_authorship_declaration" cascade;
drop table if exists public."t3a_clause_restriction" cascade;
drop table if exists public."t3a_commit_request" cascade;
drop table if exists public."t3a_cr08_quarantine" cascade;
drop table if exists public."t3a_cr09_access_record" cascade;
drop table if exists public."t3a_cr09_direct_release" cascade;
drop table if exists public."t3a_cr09_direct_release_event" cascade;
drop table if exists public."t3a_cr09_ga_event" cascade;
drop table if exists public."t3a_cr13_reconsideration_act" cascade;
drop table if exists public."t3a_cr13_reservation" cascade;
drop table if exists public."t3a_eligibility_hold_event" cascade;
drop table if exists public."t3a_entry_request" cascade;
drop table if exists public."t3a_integrity_concern" cascade;
drop table if exists public."t3a_observation_withdrawal" cascade;
drop table if exists public."t3a_observer_assignment" cascade;
drop table if exists public."t3a_observer_capture" cascade;
drop table if exists public."t3a_personnel_identity_link" cascade;
drop table if exists public."t3a_progression_challenge_event" cascade;
drop table if exists public."t3a_queued_act" cascade;
drop table if exists public."t3a_queued_act_event" cascade;
drop table if exists public."t3a_report_accessible_copy" cascade;
drop table if exists public."t3a_retake_pool_map" cascade;
drop table if exists public."t3a_s1_access_audit" cascade;
drop table if exists public."t3a_s2_determination_lock" cascade;
drop table if exists public."t3a_s4_interruption" cascade;
drop table if exists public."t3a_s4_return_constraint" cascade;
drop table if exists public."t3a_second_observer_consent_event" cascade;
drop table if exists public."t3a_session_observer" cascade;
drop table if exists public."t3a_source_design_review" cascade;
drop table if exists public."t3a_source_impact_item" cascade;
drop table if exists public."t3a_source_impact_review" cascade;
drop table if exists public."t3a_source_reservation" cascade;
drop table if exists public."t3a_source_selection_log" cascade;
drop table if exists public."t3a_stage_relation_record" cascade;
drop view if exists public."t3a_attempt_live" cascade;
drop sequence if exists public."t3a_act_sequence_act_seq_seq" cascade;
drop sequence if exists public."t3a_attempt_rule_rule_seq_seq" cascade;
drop sequence if exists public."t3a_clause_restriction_restriction_seq_seq" cascade;
drop sequence if exists public."t3a_cr09_direct_release_event_event_seq_seq" cascade;
drop sequence if exists public."t3a_cr09_ga_event_event_seq_seq" cascade;
drop sequence if exists public."t3a_cr13_reconsideration_act_act_seq_seq" cascade;
drop sequence if exists public."t3a_cr13_reservation_reservation_seq_seq" cascade;
drop sequence if exists public."t3a_eligibility_hold_event_hold_seq_seq" cascade;
drop sequence if exists public."t3a_observer_assignment_assignment_seq_seq" cascade;
drop sequence if exists public."t3a_personnel_identity_link_link_seq_seq" cascade;
drop sequence if exists public."t3a_progression_challenge_event_challenge_event_seq_seq" cascade;
drop sequence if exists public."t3a_queued_act_event_event_seq_seq" cascade;
drop sequence if exists public."t3a_retake_pool_map_map_seq_seq" cascade;
drop sequence if exists public."t3a_s1_access_audit_audit_seq_seq" cascade;
drop sequence if exists public."t3a_second_observer_consent_event_consent_seq_seq" cascade;
drop sequence if exists public."t3a_source_design_review_review_seq_seq" cascade;
drop function if exists t3a_actor_is_staff(uuid,text[]) cascade;
drop function if exists t3a_attempt_begin_base(uuid,text,t3a_stage_code,text,timestamp with time zone) cascade;
drop function if exists t3a_attempt_begin(uuid,text,t3a_stage_code,text,timestamp with time zone) cascade;
drop function if exists t3a_attempt_class_from_welfare_withdrawal() cascade;
drop function if exists t3a_attempt_commit_instant() cascade;
drop function if exists t3a_attempt_eligibility_base(uuid,text,t3a_stage_code,timestamp with time zone) cascade;
drop function if exists t3a_attempt_eligibility(uuid,text,t3a_stage_code,timestamp with time zone) cascade;
drop function if exists t3a_attempt_end(uuid,text,t3a_stage_code,text,text,timestamp with time zone) cascade;
drop function if exists t3a_attempt_event_label(text,boolean) cascade;
drop function if exists t3a_attempt_reclassify(uuid,text) cascade;
drop function if exists t3a_attempt_rule_change(text,text) cascade;
drop function if exists t3a_attempt_rule_get(text) cascade;
drop function if exists t3a_attempt_welfare_flag() cascade;
drop function if exists t3a_authorship_declare(t3a_stage_code,text,text,uuid) cascade;
drop function if exists t3a_available_reports_list(jsonb) cascade;
drop function if exists t3a_commit_observation_base(jsonb) cascade;
drop function if exists t3a_cr04_entry_identity(uuid,text,t3a_stage_code,boolean,boolean) cascade;
drop function if exists t3a_cr04_join_link(uuid) cascade;
drop function if exists t3a_cr07_final_decision(uuid) cascade;
drop function if exists t3a_cr07_restrict_clause(uuid,uuid,text,text) cascade;
drop function if exists t3a_cr07_review_bundle(uuid) cascade;
drop function if exists t3a_cr07_withdraw_observation(uuid,bigint) cascade;
drop function if exists t3a_cr08_act(uuid,text,text,text,text) cascade;
drop function if exists t3a_cr08_commit_gate() cascade;
drop function if exists t3a_cr08_lock(uuid) cascade;
drop function if exists t3a_cr08_on_revocation() cascade;
drop function if exists t3a_cr08_permission_in_effect(uuid,text) cascade;
drop function if exists t3a_cr08_quarantine_commit(uuid,text,text,text,bigint) cascade;
drop function if exists t3a_cr08_queue(uuid,text,text,text,text) cascade;
drop function if exists t3a_cr08_run_queued(uuid) cascade;
drop function if exists t3a_cr09_amend_notice() cascade;
drop function if exists t3a_cr09_consent_ok(uuid) cascade;
drop function if exists t3a_cr09_ga_on(uuid) cascade;
drop function if exists t3a_cr09_head(uuid) cascade;
drop function if exists t3a_cr09_warning_version() cascade;
drop function if exists t3a_cr13_accounts_of(uuid) cascade;
drop function if exists t3a_cr13_ineligible(text,uuid,text,uuid) cascade;
drop function if exists t3a_cr13_involvement(uuid,uuid,text[],boolean) cascade;
drop function if exists t3a_cr13_link_identity(uuid,uuid,uuid) cascade;
drop function if exists t3a_cr13_pick(text,uuid,text,uuid[]) cascade;
drop function if exists t3a_cr13_recheck(text,uuid) cascade;
drop function if exists t3a_cr13_reconsideration_state(uuid) cascade;
drop function if exists t3a_cr13_record_check(uuid,text,text) cascade;
drop function if exists t3a_cr13_record_decision(uuid,text,text) cascade;
drop function if exists t3a_cr13_reserve(text,uuid) cascade;
drop function if exists t3a_cr13_reserved(text,uuid,text) cascade;
drop function if exists t3a_cr13_same_person(uuid,uuid) cascade;
drop function if exists t3a_cr13_subject(text,uuid) cascade;
drop function if exists t3a_cr15_both_locked(uuid) cascade;
drop function if exists t3a_cr15_is_observer(uuid) cascade;
drop function if exists t3a_cr17_comparison_gate(uuid) cascade;
drop function if exists t3a_cr18_observation_committed(uuid,text,text) cascade;
drop function if exists t3a_cr18_progression_row_gate() cascade;
drop function if exists t3a_cr21_commit_for(uuid,uuid,text,uuid) cascade;
drop function if exists t3a_cr21_commit_once(uuid,text,uuid) cascade;
drop function if exists t3a_cr21_impact_review(uuid) cascade;
drop function if exists t3a_cr21_resume(uuid) cascade;
drop function if exists t3a_cr21_suspend_source_for(uuid,uuid,text) cascade;
drop function if exists t3a_cr21_suspend_source(uuid,text) cascade;
drop function if exists t3a_cr22_interrupt_for(uuid,uuid,text,uuid,boolean,boolean) cascade;
drop function if exists t3a_cr22_interrupt(uuid,text,uuid,boolean,boolean) cascade;
drop function if exists t3a_cr22_session_determinations_excluded(uuid) cascade;
drop function if exists t3a_cr23_context_pair(text,uuid,uuid) cascade;
drop function if exists t3a_cr23_source_stage(uuid) cascade;
drop function if exists t3a_cr26_not_eligible() cascade;
drop function if exists t3a_cr26_request_entry(uuid,text,t3a_stage_code,text,bigint) cascade;
drop function if exists t3a_cr26_source_for_entry(uuid) cascade;
drop function if exists t3a_cr26_source_request(text,text) cascade;
drop function if exists t3a_design_review_lifts(uuid,uuid,text) cascade;
drop function if exists t3a_design_review_record(uuid,text,text,uuid[],text,text,date,uuid,uuid) cascade;
drop function if exists t3a_direct_release_create(uuid,text,text,text,timestamp with time zone) cascade;
drop function if exists t3a_direct_release_redeem(text,text,uuid) cascade;
drop function if exists t3a_direct_release_revoke(uuid) cascade;
drop function if exists t3a_eligibility_hold_active(uuid) cascade;
drop function if exists t3a_ga_read(uuid) cascade;
drop function if exists t3a_ga_set(uuid,boolean,text) cascade;
drop function if exists t3a_identity_concern_raise(uuid,text) cascade;
drop function if exists t3a_involvement_test_base(uuid,uuid,t3a_authority) cascade;
drop function if exists t3a_mentor_session_context(uuid) cascade;
drop function if exists t3a_observer_agreement(uuid) cascade;
drop function if exists t3a_observer_capture_guard() cascade;
drop function if exists t3a_observer_capture_lock(uuid) cascade;
drop function if exists t3a_observer_capture_read(uuid) cascade;
drop function if exists t3a_observer_capture_save(uuid,jsonb) cascade;
drop function if exists t3a_observer_plan(uuid,text,text,text) cascade;
drop function if exists t3a_observer_rotation_check(uuid,uuid,text,text,text) cascade;
drop function if exists t3a_progression_challenge_notice(text) cascade;
drop function if exists t3a_progression_challenge_open_id(uuid,text) cascade;
drop function if exists t3a_progression_challenge_open(uuid) cascade;
drop function if exists t3a_progression_challenge_resolve(uuid,text,t3a_progression_value,uuid) cascade;
drop function if exists t3a_progression_eligibility_value(uuid,text,timestamp with time zone) cascade;
drop function if exists t3a_progression_record_value(uuid,text,timestamp with time zone) cascade;
drop function if exists t3a_rce_prohibited_vocabulary_load(text,text,jsonb,text) cascade;
drop function if exists t3a_rce_prohibited_vocabulary_loaded(text) cascade;
drop function if exists t3a_record_progression_decision_base(uuid,t3a_dimension_code,t3a_progression_decision,text,text) cascade;
drop function if exists t3a_record_stage_relation(uuid,text,text,text) cascade;
drop function if exists t3a_release_access_record(uuid) cascade;
drop function if exists t3a_release_state(uuid) cascade;
drop function if exists t3a_report_accessible_build(jsonb) cascade;
drop function if exists t3a_report_accessible_make(uuid) cascade;
drop function if exists t3a_report_accessible_on_issue() cascade;
drop function if exists t3a_report_accessible_read(uuid) cascade;
drop function if exists t3a_report_accessible_state(uuid) cascade;
drop function if exists t3a_report_face_text(jsonb) cascade;
drop function if exists t3a_report_verify(text) cascade;
drop function if exists t3a_retake_pool_load(text,text,text,jsonb) cascade;
drop function if exists t3a_retake_pool_of(text) cascade;
drop function if exists t3a_s1_access_allowed(uuid,text) cascade;
drop function if exists t3a_s1_access_decision(uuid,uuid,text) cascade;
drop function if exists t3a_s1_audit_confirmer() cascade;
drop function if exists t3a_s1_content_read(uuid,text,text) cascade;
drop function if exists t3a_s2_committed(uuid,text) cascade;
drop function if exists t3a_s2_lock_on_commit() cascade;
drop function if exists t3a_s4_compose_session_base(uuid,uuid,uuid,uuid[],boolean) cascade;
drop function if exists t3a_safety_hold_lift(uuid) cascade;
drop function if exists t3a_safety_hold_set(uuid,uuid) cascade;
drop function if exists t3a_second_observer_add(uuid,uuid,uuid) cascade;
drop function if exists t3a_second_observer_consent_set(uuid,boolean) cascade;
drop function if exists t3a_source_candidates(uuid,text,text) cascade;
drop function if exists t3a_source_load_check(text[]) cascade;
drop function if exists t3a_source_select(uuid,text,text,bigint) cascade;
drop function if exists t3a_tagged_text(jsonb) cascade;
commit;
