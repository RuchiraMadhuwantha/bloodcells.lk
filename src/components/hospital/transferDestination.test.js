import {transferDestination} from './transferDestination';
const main={id:3,name:'Main Blood Bank',district:'Colombo',isMain:true};
test('one main bank is used regardless of hospital district',()=>{
 expect(transferDestination([main],'Kandy')).toEqual(main);
 expect(transferDestination([main],'Galle')).toEqual(main);
});
test('missing or multiple destinations never cause regional routing',()=>{
 expect(transferDestination([])).toBeNull();
 expect(transferDestination([main,{id:4,district:'Kandy'}],'Kandy')).toBeNull();
});
